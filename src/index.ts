import fs from "fs";
import path from "path";
import { parseTypescript } from "./parseTypescript";
import { generateIndex } from "./generateIndex";
import { generateInferface } from "./generateInterface";
import { generateAbi } from "./generateAbi";

async function main() {
  const [inputFile, inputClassName] = process.argv.slice(2);

  const tsStructure = parseTypescript(inputFile, inputClassName);
  const indexData = generateIndex(tsStructure);
  const interfaceData = generateInferface(tsStructure);
  const abiData = await generateAbi(tsStructure);

  const { dir } = path.parse(inputFile);
  const outputFileIndex = path.join(dir, "index.ts");
  const outputFileInterface = path.join(dir, `I${tsStructure.className}.ts`);
  const outputFileAbi = path.join(
    dir,
    `${tsStructure.className.toLocaleLowerCase()}-abi.json`
  );

  fs.writeFileSync(outputFileIndex, indexData);
  fs.writeFileSync(outputFileInterface, interfaceData);
  fs.writeFileSync(outputFileAbi, JSON.stringify(abiData, null, 2));
  console.log(`files generated:
- ${outputFileIndex}
- ${outputFileInterface}
- ${outputFileAbi}
`);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
