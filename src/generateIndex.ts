import { TsStructure } from "./interface";
import { getAllMethods, simplifyFile } from "./utils";

export function generateIndex(tsStructure: TsStructure, dirProject: string) {
  const { className, proto, hasAuthorize, file } = tsStructure;
  const maxReturnBuffer = 1024;

  const allMethods = getAllMethods(tsStructure);

  return `import { System, Protobuf${
    hasAuthorize ? ", authority" : ""
  } } from "@koinos/sdk-as";
import { ${className} } from "${simplifyFile(file, dirProject)}";${proto
    .map((p) => {
      return `
import { ${p.className} } from "${simplifyFile(p.file, dirProject)}";`;
    })
    .join("")}

const contractArgs = System.getArguments();
let returnBuffer = new Uint8Array(${maxReturnBuffer});
const contract = new ${className}();

switch (contractArgs.entry_point) {
  ${allMethods
    .map((t) => {
      return `/* class ${t.className} */
    
  ${t.methods
    .map((m) => {
      return `// ${m.name}
  case ${m.entryPoint}: {${
        m.argType
          ? `
    const args = Protobuf.decode<${m.argType}>(contractArgs.args, ${m.argType}.decode);`
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
    System.exit(1);
    break;
  }
}

System.exit(0, returnBuffer);
`;
}

export default generateIndex;
