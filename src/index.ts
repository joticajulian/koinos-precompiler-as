import fs from "fs";
import fse from "fs-extra";
import path from "path";
import { PrecompilerConfig, TsStructure } from "./interface";
import { parseTypescript } from "./parseTypescript";
import { generateIndex } from "./generateIndex";
import { generateInferface } from "./generateInterface";
import { generateAbi } from "./generateAbi";
import { generateProto } from "./generateProto";

async function main() {
  let [configFile] = process.argv.slice(2);
  if (!configFile.endsWith(".js"))
    configFile = path.join(configFile, "koinos.config.js");
  const fullPathConfigFile = path.join(process.cwd(), configFile);
  const { dir } = path.parse(fullPathConfigFile);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(fullPathConfigFile) as PrecompilerConfig;
  const files = config.files.map((f) => path.join(dir, f));
  const proto = config.proto.map((p) => path.join(dir, p));
  const tsStructure = await parseTypescript(files, proto, config.class);

  const sourceDir = path.join(dir, "src");
  const koinosProtoDir = path.join(dir, "..", "koinos-proto");
  const buildDir = path.join(dir, "build");

  // prepare build folder
  const interfacesDir = path.join(buildDir, "interfaces");
  if (!fs.existsSync(interfacesDir))
    fs.mkdirSync(interfacesDir, { recursive: true });

  // generate index file
  const indexData = generateIndex(tsStructure, dir);
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

  // copy protos
  fse.copySync(path.join(sourceDir, "proto"), path.join(buildDir, "proto"));
  fse.copySync(
    path.join(koinosProtoDir, "koinos"),
    path.join(buildDir, "proto/koinos")
  );

  // generate proto ts
  const proto2 = proto.map((p) => p.replace(sourceDir, buildDir));
  generateProto(proto2, path.join(buildDir, "proto"));
  console.log(`files generated at ${buildDir}`);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
