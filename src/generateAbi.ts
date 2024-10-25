import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { Abi, PrecompilerConfig, TsStructure } from "./interface";
import {
  generateJsonDescriptor,
  combineTsStructures,
  findFile,
  getFiles,
} from "./utils";

const generateBinaryDescriptor = (
  protoFiles: { path: string; file: string }[],
  protoDir: string
): string => {
  const pbFilePath = `./temp-${crypto.randomBytes(5).toString("hex")}.pb`;
  const pFilesAux = Array.isArray(protoFiles) ? protoFiles : [protoFiles];
  // protos from imports
  let pFiles = pFilesAux.map((f) => findFile(f.file, f.path));

  // protos from the project
  pFiles.push(...getFiles(protoDir, ".proto"));

  // unique values
  pFiles = [...new Set(pFiles)];

  execSync(
    [
      "yarn protoc",
      `--proto_path=${protoDir}`,
      //"--include_imports",
      `--descriptor_set_out=${pbFilePath}`,
      `${pFiles.join(" ")}`,
    ].join(" ")
  );
  const descriptor = fs.readFileSync(pbFilePath);
  fs.unlinkSync(pbFilePath);
  return descriptor.toString("base64");
};

export async function generateAbi(
  tsStructure: TsStructure,
  protoImport: PrecompilerConfig["protoImport"],
  protoDir: string,
  supportAbi1 = false
): Promise<Abi> {
  const abiData: Abi = {
    methods: {},
    types: "",
    koilib_types: {},
  };

  const tsCombined = combineTsStructures(tsStructure);

  tsCombined.forEach((ts) => {
    ts.methods.forEach((m) => {
      abiData.methods[m.nameAbi] = {
        argument: m.argType,
        return: m.isVoid ? "" : m.retType,
        description: m.description,
        entry_point: Number(m.entryPoint),
        read_only: m.readOnly,
        ...(supportAbi1 && {
          "entry-point": m.entryPoint,
          "read-only": m.readOnly,
        }),
      };
    });
    ts.events.forEach((e) => {
      if (!abiData.events) abiData.events = {};
      abiData.events[e.name] = {
        type: e.argument,
        // todo: remove argument in future versions. Use type instead
        argument: e.argument,
      };
    });
  });

  const protos: { path: string; file: string }[] = [];
  tsCombined[0].imports.forEach((i) => {
    const protoPath = protoImport.find((p) => p.name === i.dependency);
    const protosToAdd = i.modules.map((m) => ({
      file: m,
      path: protoPath ? protoPath.path : protoDir,
    }));
    protos.push(...protosToAdd);
  });
  abiData.koilib_types = await generateJsonDescriptor(protos, protoDir);

  try {
    abiData.types = generateBinaryDescriptor(protos, protoDir);
  } catch (error) {
    console.error(error);
  }

  return abiData;
}

export default generateAbi;
