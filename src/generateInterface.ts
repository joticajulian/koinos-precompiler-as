import { TsStructure } from "./interface";
import { simplifyFile } from "./utils";

export function generateInferface(
  tsStructure: TsStructure,
  dirInterfaces: string
): string {
  const { className, methods } = tsStructure;
  const imports = JSON.parse(
    JSON.stringify(tsStructure.imports)
  ) as TsStructure["imports"];
  const sdkImport = imports.find((i) => i.dependency === "@koinos/sdk-as");
  if (sdkImport) {
    if (!sdkImport.modules.includes("System")) sdkImport.modules.push("System");
    if (!sdkImport.modules.includes("Protobuf"))
      sdkImport.modules.push("Protobuf");
    if (!sdkImport.modules.includes("StringBytes"))
      sdkImport.modules.push("StringBytes");
  } else {
    imports.splice(0, 0, {
      dependency: "@koinos/sdk-as",
      modules: ["System", "Protobuf", "StringBytes"],
    });
  }

  // import extended classes
  const importExtends = tsStructure.extends
    .map((e) => {
      if (e.dependency)
        return `
import { I${e.className} as ${e.className} } from "${e.dependency}";
`;
      return `
import { ${e.className} } from "./I${e.className}";`;
    })
    .join("");

  return `${imports
    .map((i) => {
      return `import { ${i.modules.join(", ")} } from "${i.dependency}";
`;
    })
    .join("")}
${importExtends}${tsStructure.proto
    .map((p) => {
      return `
import { ${p.className} } from "${simplifyFile(p.file, dirInterfaces)}";`;
    })
    .join("")}

export class ${className}${
    tsStructure.extends.length > 0
      ? ` extends ${tsStructure.extends.map((e) => e.className).join(", ")}`
      : ""
  } {${
    tsStructure.extends.length === 0
      ? `
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
  }`
      : ""
  }${methods
    .map((m) => {
      return `${m.comment}
  ${m.name}(${m.argType ? `args: ${m.argType}` : ""}): ${m.retType} {
    const argsBuffer = ${
      m.argType
        ? `Protobuf.encode(args, ${m.argType}.encode);`
        : "new Uint8Array(0);"
    }
    const callRes = System.call(this._contractId, ${m.entryPoint}, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = \`failed to call '${className}.${
        m.name
      }': \${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message! : "unknown error"}\`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    ${
      m.isVoid
        ? "return;"
        : `if (!callRes.res.object) return new ${m.retType}();
    return Protobuf.decode<${m.retType}>(callRes.res.object!, ${m.retType}.decode);`
    }
  }`;
    })
    .join("")}
}
`;
}

export default generateInferface;
