import fs from "fs";
import fse from "fs-extra";
import path from "path";
import { PrecompilerConfig, TsStructure } from "./interface";
import { parseTypescript } from "./parseTypescript";
import { generateIndex } from "./generateIndex";
import { generateInferface } from "./generateInterface";
import { generateAbi } from "./generateAbi";
import { generateProto } from "./generateProto";
import compileWasm from "./compileWasm";

async function main() {
  let [configFile] = process.argv.slice(2);
  if (!configFile.endsWith(".js"))
    configFile = path.join(configFile, "koinos.config.js");
  const fullPathConfigFile = path.join(process.cwd(), configFile);
  const { dir } = path.parse(fullPathConfigFile);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(fullPathConfigFile) as PrecompilerConfig;
  const sourceDir = config.sourceDir
    ? path.join(dir, config.sourceDir)
    : path.join(dir, "src");
  const buildDir = config.buildDir
    ? path.join(dir, config.buildDir)
    : path.join(dir, "build");
  const koinosProtoDir = config.koinosProtoDir
    ? path.join(dir, config.koinosProtoDir)
    : path.join(dir, "node_modules/koinos-precompiler-as/koinos-proto/koinos");

  // copy source files
  fse.copySync(sourceDir, buildDir);

  // copy koinos protos
  fse.copySync(koinosProtoDir, path.join(buildDir, "proto/koinos"));

  const proto = config.proto.map((p) => path.join(buildDir, p));
  const files = config.files.map((f) => path.join(buildDir, f));

  // generate proto ts
  generateProto(proto, path.join(buildDir, "proto"));
  console.log(`files generated at ${buildDir}`);

  const tsStructure = await parseTypescript(files, proto, config.class);

  // prepare subfolders
  const interfacesDir = path.join(buildDir, "interfaces");
  if (!fs.existsSync(interfacesDir))
    fs.mkdirSync(interfacesDir, { recursive: true });

  // generate index file
  const indexData = generateIndex(tsStructure, buildDir);
  const outputFileIndex = path.join(buildDir, "index.ts");
  fs.writeFileSync(outputFileIndex, indexData);

  // generate interfaces
  const generateInterfaces = (ts: TsStructure) => {
    const data = generateInferface(ts, interfacesDir);
    const outputFile = path.join(interfacesDir, `I${ts.className}.ts`);
    fs.writeFileSync(outputFile, data);
    ts.extends.forEach((e) => generateInterfaces(e));
  };
  generateInterfaces(tsStructure);

  // generate abi
  const abiData = await generateAbi(tsStructure, proto);
  const outputFileAbi = path.join(
    buildDir,
    `${config.class.toLocaleLowerCase()}-abi.json`
  );
  fs.writeFileSync(outputFileAbi, JSON.stringify(abiData, null, 2));

  // compile wasm
  await compileWasm(dir, buildDir);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
