import fs from "fs";
import crypto from "crypto";
import * as tsstruct from "ts-structure-parser";
import { parse } from "comment-parser";
import { TypeModel, Argument, TsStructure, JsonDescriptor } from "./interface";
import { generateJsonDescriptor } from "./utils";

function parseStruct2(
  structures: ReturnType<typeof tsstruct.parseStruct>[],
  refClass: string,
  protoStructure: {
    file: string;
    jsonDescriptor: JsonDescriptor;
  }[]
): TsStructure {
  // find the structure that matches the refClass
  const structureId = structures.findIndex((st) => {
    return st.classes.find((c) => c.name === refClass);
  });

  if (structureId < 0) {
    throw new Error(
      [
        `the class ${refClass} was not found in the files.`,
        `Make sure you have "files" defined in koinos.config.js`,
      ].join(" ")
    );
  }

  const structure = structures[structureId];

  const tsStructure: TsStructure = {
    className: refClass,
    file: structure.name,
    proto: [],
    methods: [],
    hasAuthorize: false,
    extends: [],
  };

  const addProto = (argType: string) => {
    const pRef = argType.split(".")[0];

    // check if it is using proto authority
    if (pRef === "authority") {
      tsStructure.hasAuthorize = true;
      return;
    }

    // skip if there is no proto to add or if it is already included
    if (!pRef || tsStructure.proto.find((p) => p.className === pRef)) return;

    const pStruct = protoStructure.find((p) => {
      return Object.keys(p.jsonDescriptor.nested).includes(pRef);
    });
    if (!pStruct) {
      throw new Error(
        [
          `the proto definition "${pRef}" referenced in the file`,
          `${tsStructure.file} was not found in the list of`,
          "proto files defined in the config file",
        ].join(" ")
      );
    }
    tsStructure.proto.push({
      className: pRef,
      file: pStruct.file,
      jsonDescriptor: pStruct.jsonDescriptor,
    });
  };

  // Determine the index of the class in the file
  const classId = structure.classes.findIndex((c) => c.name === refClass);

  // Parse data on each class method
  structure.classes[classId].methods.forEach((method) => {
    const comments = parse(method.text);

    // skip functions without comments
    if (comments.length === 0) return;

    // only 1 block comment allowed per function
    if (comments.length > 1) {
      throw new Error(
        [
          `the function "${method.name}" of class "${refClass}"`,
          `has ${comments.length} block comments. However, only`,
          " 1 block comment is allowed",
        ].join(" ")
      );
    }

    // check if the function is marked as @external
    const [comment] = comments;
    const getTag = (tag: string) => {
      return comment.tags.find((t) => t.tag.toLocaleLowerCase() === tag);
    };
    if (!getTag("external")) return;

    // 0 or 1 argument allowed, but not more
    if (method.arguments.length > 1) {
      throw new Error(
        [
          `the function "${method.name}" of class "${refClass}"`,
          `has ${method.arguments.length} arguments. However, only`,
          "1 argument is allowed. If you need more arguments consider",
          "to wrap them in a single definition in the proto file",
        ].join(" ")
      );
    }

    // check if has an @entrypoint. Otherwise calculate it
    let entryPoint: string;
    const tagEntryPoint = getTag("entrypoint");
    if (tagEntryPoint) {
      if (/^([a-zA-z])/.test(tagEntryPoint.name)) {
        // starts with a letter. Entry point defined with a custom name
        entryPoint = `0x${crypto
          .createHash("sha256")
          .update(tagEntryPoint.name)
          .digest("hex")
          .slice(0, 8)}`;
      } else {
        // entry point defined as 4-bytes number
        const number = Number(tagEntryPoint.name);
        if (Number.isNaN(number) || number > Number("0xffffffff")) {
          throw new Error(
            [
              `invalid entryPoint ${tagEntryPoint.name}. It should be`,
              " a number lower or equal to 0xffffffff",
            ].join("")
          );
        }
        entryPoint = tagEntryPoint.name;
      }
    } else {
      // calculation of the entry point from the function name
      entryPoint = `0x${crypto
        .createHash("sha256")
        .update(method.name)
        .digest("hex")
        .slice(0, 8)}`;
    }

    // check if the function is @readonly
    let readOnly: boolean;
    const tagReadOnly = getTag("readonly");
    if (tagReadOnly) {
      if (!["true", "false", ""].includes(tagReadOnly.name)) {
        throw new Error(
          [
            `invalid readOnly definition "${tagReadOnly.name}".`,
            ` It must be "true", "false", or just an empty value`,
          ].join("")
        );
      }
      if (tagReadOnly.name === "false") readOnly = false;
      else readOnly = true;
    } else {
      readOnly = false;
    }

    // get the argument and return types
    const argType =
      method.arguments.length === 0
        ? ""
        : (method.arguments[0] as unknown as Argument).type.typeName;
    const retType = (method.returnType as unknown as TypeModel).typeName;
    const isVoid = retType === "void";

    if (!getTag("ignoreproto")) {
      addProto(argType);
      if (!isVoid) addProto(retType);
    }

    // store results
    tsStructure.methods.push({
      name: method.name,
      comment: method.text.slice(0, method.text.indexOf("*/") + 2),
      description: comment.description,
      entryPoint,
      readOnly,
      argType,
      retType,
      isVoid,
    });

    // check if the class extends
    tsStructure.extends = structure.classes[classId].extends.map((e) => {
      const { typeName: parentRefClass } = e as unknown as { typeName: string };
      return parseStruct2(structures, parentRefClass, protoStructure);
    });
  });

  return tsStructure;
}

export async function parseTypescript(
  files: string[],
  proto: string[],
  className: string
): Promise<TsStructure> {
  const structures = files.map((file) => {
    try {
      const decls = fs.readFileSync(file, "utf8");
      return tsstruct.parseStruct(decls, {}, file);
    } catch (error) {
      console.error(`error reading file ${file}`);
      throw error;
    }
  });

  const protoStructure = await Promise.all(
    proto.map(async (p) => {
      return {
        file: p,
        jsonDescriptor: await generateJsonDescriptor(p),
      };
    })
  );

  return parseStruct2(structures, className, protoStructure);
}
