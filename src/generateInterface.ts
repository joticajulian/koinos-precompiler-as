import { TsStructure } from "./interface";
import { simplifyFile } from "./utils";

export function generateInferface(
  tsStructure: TsStructure,
  dirInterfaces: string
): string {
  const { className, methods, hasAuthorize } = tsStructure;

  return `import { System, Protobuf, StringBytes${
    hasAuthorize ? ", authority" : ""
  } } from "@koinos/sdk-as";${tsStructure.extends
    .map((e) => {
      return `
import { ${e.className} } from "./I${e.className}";`;
    })
    .join("")}${tsStructure.proto
    .map((p) => {
      return `
import { ${p.className} } from "${simplifyFile(p.file, dirInterfaces)}";`;
    })
    .join("")}

export class ${className}${
    tsStructure.extends.length > 0
      ? ` extends ${tsStructure.extends.map((e) => e.className).join(", ")}`
      : ""
  } {
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
    const callRes = System.call(this._contractId, ${m.entryPoint}, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = \`failed to call '${className}.${
        m.name
      }': \${callRes.res.error ? callRes.res.error.message : ""}\`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    ${
      m.isVoid
        ? "return;"
        : `return Protobuf.decode<${m.retType}>(callRes.res.object!, ${m.retType}.decode);`
    }
  }`;
    })
    .join("")}
}
`;
}

export default generateInferface;
