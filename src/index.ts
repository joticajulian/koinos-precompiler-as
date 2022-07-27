import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as tsstruct from "ts-structure-parser";
import { parse } from "comment-parser";

interface TypeModel {
  typeName: string;
}

interface Argument {
  name: string;
  type: TypeModel;
}

const [inputFile] = process.argv.slice(2);
const decls = fs.readFileSync(inputFile, "utf8");
const structure = tsstruct.parseStruct(decls, {}, inputFile);

const className = structure.classes[0].name;
const protoAs = className.toLocaleLowerCase();
const methods: {
  name: string;
  comment: string;
  entryPoint: string;
  argType: string;
  retType: string;
  isVoid: boolean;
}[] = [];

structure.classes[0].methods.forEach((method) => {
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
  if (!comment.tags.find((t) => t.tag === "external")) return;

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
  const tagEntryPoint = comment.tags.find((t) => t.tag === "entryPoint");
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

  const argType =
    method.arguments.length === 0
      ? ""
      : (method.arguments[0] as unknown as Argument).type.typeName;
  const retType = (method.returnType as unknown as TypeModel).typeName;

  methods.push({
    name: method.name,
    comment: method.text,
    entryPoint,
    argType,
    retType,
    isVoid: retType === "void",
  });
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
      return `${m.comment.slice(0, m.comment.indexOf("*/") + 2)}
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

const outputFileIndex = path.join(path.parse(inputFile).dir, "index.ts");
const outputFileInterface = path.join(
  path.parse(inputFile).dir,
  `I${className}.ts`
);

fs.writeFileSync(outputFileIndex, indexData);
fs.writeFileSync(outputFileInterface, interfaceData);
console.log(`files generated:
- ${outputFileIndex}
- ${outputFileInterface}
`);
