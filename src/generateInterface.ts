import { TsStructure } from "./interface";
import { simplifyFile } from "./utils";

export function generateInferface(tsStructure: TsStructure, dirInterfaces: string): string {
  const { className, methods, hasAuthorize } = tsStructure;

  return `import { System, Protobuf${
    hasAuthorize ? ", authority" : ""
  } } from "koinos-sdk-as";${tsStructure.extends
    .map((e) => {
      return `
import { ${e.className} } from "./I${e.className}";`;
    })
    .join("")}${tsStructure.proto.map((p) => {
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
}

export default generateInferface;
