import { Abi, TsStructure } from "./interface";

export function generateAbi(tsStructure: TsStructure): Abi {
  const abiData: Abi = {
    methods: {},
    types: "",
    koilib_types: {},
  };

  tsStructure.methods.forEach((m) => {
    abiData.methods[m.name] = {
      argument: m.argType,
      return: m.isVoid ? "" : m.retType,
      description: m.description,
      entry_point: Number(m.entryPoint),
      read_only: m.readOnly,
      "read-only": m.readOnly,
    };
  });

  return abiData;
}

export default generateAbi;
