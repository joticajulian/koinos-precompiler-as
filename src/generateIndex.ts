import { TsStructure } from "./interface";

export function generateIndex(tsStructure: TsStructure) {
  const { className, protoAs, methods, hasAuthorize } = tsStructure;
  const maxReturnBuffer = 1024;

  return `import { System, Protobuf${
    hasAuthorize ? ", authority" : ""
  } } from "koinos-sdk-as";
import { ${className} } from "./${className}";${protoAs
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
}

export default generateIndex;
