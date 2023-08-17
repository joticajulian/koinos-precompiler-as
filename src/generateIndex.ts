import { TsStructure } from "./interface";
import { combineTsStructures, simplifyFile } from "./utils";

export function generateIndex(tsStructure: TsStructure, dirProject: string) {
  const { className, file } = tsStructure;
  const maxReturnBuffer = 1024;

  const tsCombined = combineTsStructures(tsStructure);
  const imports = JSON.parse(
    JSON.stringify(tsCombined[0].imports)
  ) as TsStructure["imports"];
  const sdkImport = imports.find((i) => i.dependency === "@koinos/sdk-as");
  if (sdkImport) {
    if (!sdkImport.modules.includes("System")) sdkImport.modules.push("System");
    if (!sdkImport.modules.includes("Protobuf"))
      sdkImport.modules.push("Protobuf");
  } else {
    imports.splice(0, 0, {
      dependency: "@koinos/sdk-as",
      modules: ["System", "Protobuf"],
    });
  }

  return `import { ${className} } from "${simplifyFile(
    file,
    dirProject
  )}";${imports
    .map((i) => {
      return `
import { ${i.modules.join(", ")} } from "${i.dependency}";`;
    })
    .join("")}

const contract = new ${className}();
contract.callArgs = System.getArguments();
let returnBuffer = new Uint8Array(${maxReturnBuffer});

switch (contract.callArgs!.entry_point) {
  ${tsCombined
    .map((t) => {
      return `/* class ${t.className} */
    
  ${t.methods
    .map((m) => {
      return `// ${m.name}
  case ${m.entryPoint}: {${
        m.argType
          ? `
    const args = Protobuf.decode<${m.argType}>(contract.callArgs!.args, ${m.argType}.decode);`
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
