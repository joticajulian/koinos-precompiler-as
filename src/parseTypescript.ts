import fs from "fs";
import crypto from "crypto";
import * as tsstruct from "ts-structure-parser";
import { parse } from "comment-parser";
import { TypeModel, Argument, TsStructure } from "./interface";

export function parseTypescript(
  file: string,
  inputClassName: string
): TsStructure {
  const decls = fs.readFileSync(file, "utf8");
  const structure = tsstruct.parseStruct(decls, {}, file);

  // Determine the index of the class in the file
  let classId = 0;
  if (structure.classes.length > 1) {
    if (!inputClassName) {
      throw new Error(
        [
          `the file ${file} has ${structure.classes.length}`,
          " classes. Please specify which is the main class",
        ].join("")
      );
    }
    classId = structure.classes.findIndex((c) => c.name === inputClassName);
    if (classId < 0) {
      throw new Error(`the class ${inputClassName} was not found`);
    }
  }

  // Define output variable
  const className = structure.classes[classId].name;
  const tsStructure: TsStructure = {
    file,
    className,
    protoAs: [structure.classes[classId].name.toLocaleLowerCase()],
    methods: [],
    hasAuthorize: true,
  };

  // Parse data on each class method
  structure.classes[classId].methods.forEach((method) => {
    const comments = parse(method.text);

    // skip functions without comments
    if (comments.length === 0) return;

    // only 1 block comment allowed per function
    if (comments.length > 1) {
      throw new Error(
        [
          `the function "${method.name}" has ${comments.length}`,
          " block comments. However, only 1 block comment is allowed",
        ].join("")
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
          `the function "${method.name}" has ${method.arguments.length}`,
          " arguments. However, only 1 argument is allowed.",
          " If you need more arguments consider to wrap them in a",
          " single definition in the proto file of the project",
        ].join("")
      );
    }

    // check if has an @entryPoint. Otherwise calculate it
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

    // check if the function is @readOnly
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

  return tsStructure;
}
