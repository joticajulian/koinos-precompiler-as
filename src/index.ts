import fs from "fs";
import path from "path";
import { PrecompilerConfig, TsStructure } from "./interface";
import { parseTypescript } from "./parseTypescript";
import { generateIndex } from "./generateIndex";
import { generateInferface } from "./generateInterface";
import { generateAbi } from "./generateAbi";

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
  const tsStructure = parseTypescript(files, config.class);

  // prepare build folder
  const buildDir = path.join(dir, "build/interfaces");
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  // generate index file
  const indexData = generateIndex(tsStructure);
  const outputFileIndex = path.join(dir, "build/index.ts");
  fs.writeFileSync(outputFileIndex, indexData);

  // generate interfaces
  const generateInterfaces = (ts: TsStructure) => {
    const data = generateInferface(ts);
    const outputFile = path.join(dir, `build/interfaces/I${ts.className}.ts`);
    fs.writeFileSync(outputFile, data);
    ts.extends.forEach((e) => generateInterfaces(e));
  };
  generateInterfaces(tsStructure);

  const abiData = await generateAbi(tsStructure, proto);
  const outputFileAbi = path.join(
    dir,
    `build/${config.class.toLocaleLowerCase()}-abi.json`
  );
  fs.writeFileSync(outputFileAbi, JSON.stringify(abiData, null, 2));
  console.log(`files generated at ${path.join(dir, "build")}`);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
