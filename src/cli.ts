import fs from "fs";
import fse from "fs-extra";
import path from "path";
import { program } from "commander";
import { TsStructure } from "./interface";
import { getConfig } from "./getConfig";
import { parseTypescript } from "./parseTypescript";
import { generateIndex } from "./generateIndex";
import { generateInferface } from "./generateInterface";
import { generateAbi } from "./generateAbi";
import { generateProto } from "./generateProto";
import { getFiles } from "./utils";

async function main() {
  program.option("--all");
  program.option("--copysrc");
  program.option("--proto");
  program.option("--interface");
  program.option("--abi");
  program.option("--precompile");

  program.parse();

  const options = program.opts();

  const {
    sourceDir,
    buildDir,
    protoImport,
    files,
    class: cclass,
  } = getConfig(program.args[0]);

  const protoImport2 = protoImport.map((p) => ({
    ...p,
    path: path.join(buildDir, "proto", path.parse(p.path).name),
  }));

  if (Object.keys(options).length === 0) {
    // do all if no options are provided
    options.all = true;
  }

  if (options.all) {
    options.copysrc = true;
    options.proto = true;
    options.interface = true;
    options.abi = true;
    options.precompile = true;
  }

  if (options.copysrc) {
    // copy source files
    fse.copySync(sourceDir, buildDir);
    console.log(`source file copied to ${buildDir}`);
  }

  if (options.proto) {
    // copy other folders with proto
    protoImport.forEach((p, i) => {
      fse.copySync(p.path, protoImport2[i].path, {
        filter: (s) => !p.exclude || !p.exclude.some((e) => s.includes(e)),
      });
    });

    // generate proto ts
    generateProto(path.join(buildDir, "proto"));
    const protoFilesTs = getFiles(path.join(buildDir, "proto"), ".ts");
    protoFilesTs.forEach((pTs) => {
      const filename = path.parse(pTs).base;
      fs.copyFileSync(pTs, path.join(sourceDir, "proto", filename));
    });
    console.log(`proto files generated at ${path.join(buildDir, "proto")}`);
  }

  if (options.precompile || options.interface || options.abi) {
    const tsStructure = parseTypescript(files, cclass);

    if (options.interface) {
      // generate interfaces
      const generateInterfaces = (ts: TsStructure) => {
        const data = generateInferface(ts, buildDir);
        const outputFile = path.join(buildDir, `I${ts.className}.ts`);
        fs.writeFileSync(outputFile, data);
        ts.extends.forEach((e) => generateInterfaces(e));
      };
      generateInterfaces(tsStructure);
      console.log(`interfaces generated at ${buildDir}`);
    }

    if (options.abi) {
      // generate abi
      const abiData = await generateAbi(
        tsStructure,
        protoImport2,
        path.join(buildDir, "proto")
      );
      const outputFileAbi = path.join(
        buildDir,
        `${cclass.toLocaleLowerCase()}-abi.json`
      );
      fs.writeFileSync(outputFileAbi, JSON.stringify(abiData, null, 2));
      console.log(`abi file generated at ${outputFileAbi}`);
    }

    if (options.precompile) {
      // generate index file
      const indexData = generateIndex(tsStructure, buildDir);
      const outputFileIndex = path.join(buildDir, "index.ts");
      fs.writeFileSync(outputFileIndex, indexData);
      console.log(
        `precompilation generated at ${path.join(buildDir, "index.ts")}`
      );
    }
  }
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
