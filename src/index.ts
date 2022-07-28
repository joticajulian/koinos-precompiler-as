import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as tsstruct from "ts-structure-parser";
import { parse } from "comment-parser";
import { Abi, TypeModel, Argument } from "./interface";

const [inputFile, inputClassName] = process.argv.slice(2);
const decls = fs.readFileSync(inputFile, "utf8");
const structure = tsstruct.parseStruct(decls, {}, inputFile);

let classId = 0;
if (structure.classes.length > 1) {
  if (!inputClassName) {
    throw new Error(
      [
        `the file ${inputFile} has ${structure.classes.length}`,
        " classes. Please specify which is the main class",
      ].join("")
    );
  }
  classId = structure.classes.findIndex((c) => c.name === inputClassName);
  if (classId < 0) {
    throw new Error(`the class ${inputClassName} was not found`);
  }
}

const className = structure.classes[classId].name;
const protoAs = className.toLocaleLowerCase();
const methods: {
  name: string;
  comment: string;
  entryPoint: string;
  argType: string;
  retType: string;
  isVoid: boolean;
}[] = [];

const abiData: Abi = {
  methods: {},
  types: "",
  koilib_types: {},
};

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
  methods.push({
    name: method.name,
    comment: method.text.slice(0, method.text.indexOf("*/") + 2),
    entryPoint,
    argType,
    retType,
    isVoid,
  });

  // include method in the abi
  abiData.methods[method.name] = {
    argument: argType,
    return: isVoid ? "" : retType,
    description: comment.description,
    entry_point: Number(entryPoint),
    read_only: readOnly,
    "read-only": readOnly,
  };
});

const maxReturnBuffer = 1024;
const hasAuthorize = true;

const indexData = `import { System, Protobuf${
  hasAuthorize ? ", authority" : ""
} } from "koinos-sdk-as";
import { ${className} } from "./${className}";
import { ${protoAs} } from "./proto/${protoAs}";

const entryPoint = System.getEntryPoint();
const argsBuffer = System.getContractArguments();
let returnBuffer = new Uint8Array(${maxReturnBuffer});
const contract = new ${className}();

switch (entryPoint) {
  ${methods
    .map((m) => {
      return `// ${m.name}
  case ${m.entryPoint}: {${
        m.argType
          ? `
    const args = Protobuf.decode<${m.argType}>(argsBuffer, ${m.argType}.decode);`
          : ""
      }
    ${m.isVoid ? "" : "const result = "}contract.${m.name}(${
        m.argType ? "args" : ""
      });
    ${
      m.isVoid
        ? `returnBuffer = new Uint8Array(0);`
        : `returnBuffer = Protobuf.encode(result, ${m.retType}.encode);`
    }
    break;
  }

  `;
    })
    .join("")}default: {
    System.exitContract(1);
    break;
  }
}

System.setContractResult(returnBuffer);
System.exitContract(0);
`;

const interfaceData = `import { Protobuf, System } from "koinos-sdk-as";
import { ${protoAs} } from "./proto/${protoAs}";

export class ${className} {
  _contractId: Uint8Array;

  /**
   * Create an instance of a ${className} contract
   * @example
   * ${"```"}ts
   *   const contract = new ${className}(Base58.decode("1DQzuCcTKacbs9GGScFTU1Hc8BsyARTPqe"));
   * ${"```"}
   */
  constructor(contractId: Uint8Array) {
    this._contractId = contractId;
  }${methods
    .map((m) => {
      return `${m.comment}
  ${m.name}(${m.argType ? `args: ${m.argType}` : ""}): ${m.retType} {
    const argsBuffer = ${
      m.argType
        ? `Protobuf.encode(args, ${m.argType}.encode);`
        : "new Uint8Array(0);"
    }
    ${
      m.isVoid ? "" : "const resultBuffer = "
    }System.callContract(this._contractId, ${m.entryPoint}, argsBuffer);
    ${
      m.isVoid
        ? "return;"
        : `return Protobuf.decode<${m.retType}>(resultBuffer, ${m.retType}.decode);`
    }
  }`;
    })
    .join("")}
}
`;

const { dir } = path.parse(inputFile);
const outputFileIndex = path.join(dir, "index.ts");
const outputFileInterface = path.join(dir, `I${className}.ts`);
const outputFileAbi = path.join(
  dir,
  `${className.toLocaleLowerCase()}-abi.json`
);

fs.writeFileSync(outputFileIndex, indexData);
fs.writeFileSync(outputFileInterface, interfaceData);
fs.writeFileSync(outputFileAbi, JSON.stringify(abiData, null, 2));
console.log(`files generated:
- ${outputFileIndex}
- ${outputFileInterface}
- ${outputFileAbi}
`);
