import * as pbjs from "protobufjs-cli/pbjs";
import fs from "fs";
import path from "path";
import { JsonDescriptor, TsStructure } from "./interface";

export function simplifyFile(f: string, relativeTo: string): string {
  let fileRef: string = path.relative(relativeTo, f).replace(/\\/g, "/");
  if (!fileRef.startsWith("./") && !fileRef.startsWith("../")) {
    fileRef = `./${fileRef}`;
  }
  if (fileRef.endsWith(".ts")) {
    fileRef = fileRef.substring(0, fileRef.length - 3);
  } else if (fileRef.endsWith(".proto")) {
    fileRef = fileRef.substring(0, fileRef.length - 6);
  }
  return fileRef;
}

/**
 * Get files of a specific directory with same extension
 */
export function getFiles(filepath: string, ext: ".proto" | ".ts"): string[] {
  const files: string[] = [];
  const results = fs.readdirSync(filepath, { withFileTypes: true });
  results.forEach((result) => {
    if (result.isDirectory()) return;
    if (!result.name.endsWith(ext)) return;
    files.push(path.join(filepath, result.name));
  });
  return files;
}

/**
 * Find a .proto file recursively in a path
 * @param file name of the proto file
 * @param filepath root folder to start the search
 * @returns
 */
export function findFile(file: string, filepath: string): string {
  const filename = `${path.parse(file).name}.proto`;
  const results = fs.readdirSync(filepath, { withFileTypes: true });
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.isDirectory()) {
      const fileFound = findFile(filename, path.join(filepath, result.name));
      if (fileFound) return fileFound;
    } else if (result.name === filename) {
      return path.join(filepath, filename);
    }
  }
  return "";
}

export function combineTsStructures(
  ts: TsStructure,
  entryPoints: string[] = [],
  proto: TsStructure["proto"] = [],
  events: TsStructure["events"] = [],
  imports: TsStructure["imports"] = []
): TsStructure[] {
  const allMethods: TsStructure[] = [];
  const methodsToAdd = ts.methods.filter(
    (m) => !entryPoints.includes(m.entryPoint)
  );
  const protosToAdd = ts.proto.filter(
    (p) => !proto.find((pp) => p.file === pp.file)
  );
  const eventsToAdd = ts.events.filter(
    (e) => !events.find((ee) => e.name === ee.name)
  );
  const isImportedFile = !!ts.dependency;
  ts.imports.forEach((i) => {
    const impIndex = imports.findIndex((ii) => {
      return isImportedFile
        ? ii.dependency === ts.dependency
        : ii.dependency === i.dependency;
    });
    if (impIndex < 0)
      imports.push(isImportedFile ? { ...i, dependency: ts.dependency } : i);
    else {
      i.modules.forEach((m) => {
        if (!imports[impIndex].modules.includes(m))
          imports[impIndex].modules.push(m);
      });
    }
  });
  allMethods.push({
    ...ts,
    methods: methodsToAdd,
    proto: protosToAdd,
    events: eventsToAdd,
  });
  ts.methods.forEach((m) => entryPoints.push(m.entryPoint));
  ts.proto.forEach((p) => proto.push(p));
  ts.extends.forEach((e) => {
    allMethods.push(
      ...combineTsStructures(e, entryPoints, proto, events, imports)
    );
  });
  allMethods[0].imports = imports;

  return allMethods;
}

export const generateJsonDescriptor = async (
  protoFiles: { path: string; file: string }[],
  protoDir: string
): Promise<JsonDescriptor> => {
  return new Promise((resolve, reject) => {
    const pFilesAux = Array.isArray(protoFiles) ? protoFiles : [protoFiles];
    // protos from imports
    let pFiles = pFilesAux
      // find file in path
      .map((f) => {
        const foundFile = findFile(f.file, f.path);
        if (!foundFile) {
          throw new Error(
            `file ${f.file}.proto not found in path ${f.path}. Make sure to define its corresponding folder in the "protoImport" field of koinos.config.js`
          );
        }
        return foundFile;
      });

    // protos from the project
    pFiles.push(...getFiles(protoDir, ".proto"));

    // unique values
    pFiles = [...new Set(pFiles)];

    pbjs.main(
      ["--keep-case", "--path", protoDir, "--target", "json", ...pFiles],
      (err, output) => {
        if (err) reject(err);
        if (output) {
          const jsonDescriptor = JSON.parse(output) as JsonDescriptor;
          delete jsonDescriptor.nested.google;
          resolve(jsonDescriptor);
        } else {
          resolve({
            nested: {},
          });
        }
      }
    );
  });
};
