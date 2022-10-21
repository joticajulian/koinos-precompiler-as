import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { Abi, TsStructure } from "./interface";
import { generateJsonDescriptor, combineTsStructures } from "./utils";

const generateBinaryDescriptor = (protoFilesPaths: string[]): string => {
  const pbFilePath = `./temp-${crypto.randomBytes(5).toString("hex")}.pb`;
  const protoPath = path.parse(protoFilesPaths[0]).dir;
  execSync(
    [
      "yarn protoc",
      `--proto_path=${protoPath}`,
      `--descriptor_set_out=${pbFilePath}`,
      `${protoFilesPaths.join(" ")}`,
    ].join(" ")
  );
  const descriptor = fs.readFileSync(pbFilePath);
  fs.unlinkSync(pbFilePath);
  return descriptor.toString("base64");
};

export async function generateAbi(
  tsStructure: TsStructure,
  protoFiles: string[]
): Promise<Abi> {
  const abiData: Abi = {
    methods: {},
    types: "",
    koilib_types: {},
  };

  const tsCombined = combineTsStructures(tsStructure);

  tsCombined.forEach((ts) => {
    ts.methods.forEach((m) => {
      abiData.methods[m.name] = {
        argument: m.argType,
        return: m.isVoid ? "" : m.retType,
        description: m.description,
        entry_point: Number(m.entryPoint),
        "entry-point": m.entryPoint,
        read_only: m.readOnly,
        "read-only": m.readOnly,
      };
    });
  });

  abiData.koilib_types = await generateJsonDescriptor(protoFiles);

  try {
    abiData.types = generateBinaryDescriptor(protoFiles);
  } catch (error) {
    console.error(error);
  }

  return abiData;
}

export default generateAbi;
