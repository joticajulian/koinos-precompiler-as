import fs from "fs";
import crypto from "crypto";
import * as tsstruct from "koinos-ts-structure-parser";
import { parse } from "comment-parser";
import { TypeModel, Argument, TsStructure, FileDep } from "./interface";

function parseStruct2(
  structures: ReturnType<typeof tsstruct.parseStruct>[],
  refClass: string,
  files: FileDep[]
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
    dependency: files.find((f) => f.path === structure.name)?.dependency || "",
    imports: [],
    proto: [],
    methods: [],
    events: [],
    extends: [],
  };

  const addProto = (argType: string) => {
    const pRef = argType.split(".")[0];
    const imp = structure.imports2.find((i) => i.modules.includes(pRef));
    if (!imp) {
      console.log(
        `warning: the proto type ${pRef} was not found in the imports`
      );
      return;
    }

    const impIndex = tsStructure.imports.findIndex(
      (i) => i.dependency === imp.dependency
    );
    if (impIndex < 0) {
      tsStructure.imports.push({
        dependency: imp.dependency,
        modules: [pRef],
      });
    } else if (!tsStructure.imports[impIndex].modules.includes(pRef)) {
      tsStructure.imports[impIndex].modules.push(pRef);
    }
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
    if (!method.returnType) {
      throw new Error(
        [
          `no returnType defined for method "${method.name}"`,
          ` in class "${refClass}"`,
        ].join(" ")
      );
    }
    const retType = (method.returnType as unknown as TypeModel).typeName;
    const isVoid = retType === "void";

    if (!getTag("ignoreproto")) {
      addProto(argType);
      if (!isVoid) addProto(retType);
    }

    // add events
    const tagsEvent = comment.tags.filter(
      (t) => t.tag.toLocaleLowerCase() === "event"
    );
    tagsEvent.forEach((tagEvent) => {
      tsStructure.events.push({
        name: tagEvent.name,
        argument: tagEvent.description,
      });
    });

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
  });

  // check if the class extends
  tsStructure.extends = structure.classes[classId].extends.map((e) => {
    const { typeName: parentRefClass } = e as unknown as { typeName: string };
    return parseStruct2(structures, parentRefClass, files);
  });

  return tsStructure;
}

export function parseTypescript(
  files: FileDep[],
  className: string
): TsStructure {
  const structures = files.map((file) => {
    try {
      const decls = fs.readFileSync(file.path, "utf8");
      return tsstruct.parseStruct(decls, {}, file.path);
    } catch (error) {
      console.error(`error reading file ${file.path}`);
      throw error;
    }
  });

  return parseStruct2(structures, className, files);
}
