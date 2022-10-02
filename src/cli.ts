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
    koinosProtoDir,
    proto,
    files,
    class: cclass,
  } = getConfig(program.args[0]);

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
    // copy koinos protos
    fse.copySync(
      path.join(koinosProtoDir, "koinos"),
      path.join(buildDir, "proto/koinos")
    );
    fse.copySync(
      path.join(koinosProtoDir, "google"),
      path.join(buildDir, "proto/google")
    );

    // generate proto ts
    generateProto(proto, path.join(buildDir, "proto"));
    proto.forEach((p) => {
      const pRelative = path.relative(buildDir, p);
      const pSource = path.parse(path.join(sourceDir, pRelative));
      fs.copyFileSync(p, path.join(pSource.dir, `${pSource.name}.ts`));
    });
    console.log(`proto files generated at ${path.join(buildDir, "proto")}`);
  }

  if (options.precompile || options.interface || options.abi) {
    const tsStructure = await parseTypescript(files, proto, cclass);

    if (options.interface) {
      // prepare subfolders
      const interfacesDir = path.join(buildDir, "interfaces");
      if (!fs.existsSync(interfacesDir))
        fs.mkdirSync(interfacesDir, { recursive: true });

      // generate interfaces
      const generateInterfaces = (ts: TsStructure) => {
        const data = generateInferface(ts, interfacesDir);
        const outputFile = path.join(interfacesDir, `I${ts.className}.ts`);
        fs.writeFileSync(outputFile, data);
        ts.extends.forEach((e) => generateInterfaces(e));
      };
      generateInterfaces(tsStructure);
      console.log(`interfaces generated at ${interfacesDir}`);
    }

    if (options.abi) {
      // generate abi
      const abiData = await generateAbi(tsStructure, proto);
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
