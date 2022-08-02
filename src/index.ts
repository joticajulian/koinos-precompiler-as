import fs from "fs";
import path from "path";
import { PrecompilerConfig } from "./interface";
import { parseTypescript } from "./parseTypescript";
import { generateIndex } from "./generateIndex";
//import { generateInferface } from "./generateInterface";
//import { generateAbi } from "./generateAbi";

async function main() {
  const [configFile] = process.argv.slice(2);
  const fullPathConfigFile = path.join(process.cwd(), configFile);
  const { dir } = path.parse(fullPathConfigFile);
  const config = require(fullPathConfigFile) as PrecompilerConfig;
  const files = config.files.map((f) => path.join(dir, f));
  //const proto = config.proto.map(p => path.join(dir, "proto", p));
  const tsStructure = parseTypescript(files, config.class);
  const indexData = generateIndex(tsStructure);
  //const interfaceData = generateInferface(tsStructure);
  //const abiData = await generateAbi(tsStructure);

  const buildDir = path.join(dir, "build");
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  const outputFileIndex = path.join(dir, "build/index.ts");
  /*const outputFileInterface = path.join(dir, `build/I${tsStructure.className}.ts`);
  const outputFileAbi = path.join(
    dir,
    `${tsStructure.className.toLocaleLowerCase()}-abi.json`
  );*/

  fs.writeFileSync(outputFileIndex, indexData);
  //fs.writeFileSync(outputFileInterface, interfaceData);
  //fs.writeFileSync(outputFileAbi, JSON.stringify(abiData, null, 2));
  /*console.log(`files generated:
- ${outputFileIndex}
- ${outputFileInterface}
- ${outputFileAbi}
`);*/
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
