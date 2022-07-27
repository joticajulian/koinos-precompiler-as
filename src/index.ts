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

const filePath = path.join(__dirname, "../tests/assets/testfile.ts");
const decls = fs.readFileSync(filePath, "utf8");
const jsonStructure = tsstruct.parseStruct(decls, {}, filePath);

const className = jsonStructure.classes[0].name;
const protoAs = className.toLocaleLowerCase();
const methods = jsonStructure.classes[0].methods.map((method) => {
  const argType =
    method.arguments.length === 0
      ? undefined
      : (method.arguments[0] as unknown as Argument).type.typeName;
  const retType = (method.returnType as unknown as TypeModel).typeName;

  return {
    ...method,
    entryPoint: `0x${crypto
      .createHash("sha256")
      .update(method.name)
      .digest("hex")
      .slice(0, 8)}`,
    comments: parse(method.text),
    argType,
    retType,
    isVoid: retType === "void",
  };
});
const externalMethods = methods.filter((method) => {
  if (method.comments.length === 0)
    throw new Error(`No comments found in the function ${method.name}`);

  if (method.comments.length > 1)
    throw new Error(
      `The function ${method.name} has ${method.comments.length} block comments. However, only 1 block comment is allowed`
    );

  const externalTag = method.comments[0].tags.find(
    (tag) => tag.tag === "external"
  );
  return !!externalTag;
});
const maxReturnBuffer = 1024;
const hasAuthorize = true;

const indexTs = `import { System, Protobuf${
  hasAuthorize ? ", authority" : ""
} } from "koinos-sdk-as";
import { ${className} } from "./${className}";
import { ${protoAs} } from "./proto/${protoAs}";

const entryPoint = System.getEntryPoint();
const argsBuffer = System.getContractArguments();
let returnBuffer = new Uint8Array(${maxReturnBuffer});
const contract = new ${className}();

switch (entryPoint) {
  ${externalMethods
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
  },

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
console.log(indexTs);
