import path from "path";
import { TsStructure } from "./interface";
import { getAllMethods } from "./utils";

export function generateIndex(tsStructure: TsStructure, dirProject: string) {
  const { className, protoAs, hasAuthorize, file } = tsStructure;
  const maxReturnBuffer = 1024;
  // TODO: use replaceAll
  let fileRef: string = path.relative(dirProject, file).replace("\\", "/");
  if (!fileRef.startsWith("./") && !fileRef.startsWith("../")) {
    fileRef = `./${fileRef}`;
  }
  if (fileRef.endsWith(".ts")) {
    fileRef = fileRef.substring(0, fileRef.length - 3);
  }

  const allMethods = getAllMethods(tsStructure);

  return `import { System, Protobuf${
    hasAuthorize ? ", authority" : ""
  } } from "koinos-sdk-as";
import { ${className} } from "${fileRef}";${protoAs
    .map((p) => {
      return `
import { ${p} } from "./proto/${p}";`;
    })
    .join("")}

const entryPoint = System.getEntryPoint();
const argsBuffer = System.getContractArguments();
let returnBuffer = new Uint8Array(${maxReturnBuffer});
const contract = new ${className}();

switch (entryPoint) {
  ${allMethods
    .map((t) => {
      return `/* class ${t.className} */
    
  ${t.methods
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
    .join("")}`;
    })
    .join("")}default: {
    System.exitContract(1);
    break;
  }
}

System.setContractResult(returnBuffer);
System.exitContract(0);
`;
}

export default generateIndex;
