import fs from "fs";
import path from "path";
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
  return {
    ...method,
    comments: parse(method.text),
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
      const argType = (m.arguments[0] as unknown as Argument).type.typeName;
      const retType = (m.returnType as unknown as TypeModel).typeName;
      return `// ${m.name}
  case 0x12345678: {
    const args = Protobuf.decode<${argType}>(argsBuffer, ${argType}.decode);
    const result = contract.${m.name}(args);
    returnBuffer = Protobuf.encode(result, ${retType}.encode);
    break;
  },

  `;
    })
    .join("")}
}
`;
console.log(indexTs);
