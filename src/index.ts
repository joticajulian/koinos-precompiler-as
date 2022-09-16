import fs from "fs";
import fse from "fs-extra";
import path from "path";
import { TsStructure } from "./interface";
import { getConfig } from "./getConfig";
import { parseTypescript } from "./parseTypescript";
import { generateIndex } from "./generateIndex";
import { generateInferface } from "./generateInterface";
import { generateAbi } from "./generateAbi";
import { generateProto } from "./generateProto";

async function main() {
  let [configFile] = process.argv.slice(2);
  const {
    sourceDir,
    buildDir,
    koinosProtoDir,
    proto,
    files,
    class: cclass,
  } = getConfig(configFile);

  // copy source files
  fse.copySync(sourceDir, buildDir);

  // copy koinos protos
  fse.copySync(koinosProtoDir, path.join(buildDir, "proto/koinos"));

  // generate proto ts
  generateProto(proto, path.join(buildDir, "proto"));
  console.log(`files generated at ${buildDir}`);

  const tsStructure = await parseTypescript(files, proto, cclass);

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
    `${cclass.toLocaleLowerCase()}-abi.json`
  );
  fs.writeFileSync(outputFileAbi, JSON.stringify(abiData, null, 2));
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
