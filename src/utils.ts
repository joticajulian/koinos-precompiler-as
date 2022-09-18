import * as pbjs from "protobufjs-cli/pbjs";
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

export function getAllMethods(
  ts: TsStructure,
  entryPoints: string[] = []
): TsStructure[] {
  const allMethods: TsStructure[] = [];
  const methodsToAdd = ts.methods.filter(
    (m) => !entryPoints.includes(m.entryPoint)
  );
  if (methodsToAdd.length > 0)
    allMethods.push({ ...ts, methods: methodsToAdd });
  ts.methods.forEach((m) => entryPoints.push(m.entryPoint));
  ts.extends.forEach((e) => {
    allMethods.push(...getAllMethods(e, entryPoints));
  });

  return allMethods;
}

export const generateJsonDescriptor = async (
  protoFiles: string | string[]
): Promise<JsonDescriptor> => {
  return new Promise((resolve, reject) => {
    const pFiles = Array.isArray(protoFiles) ? protoFiles : [protoFiles];
    pbjs.main(["--keep-case", "--target", "json", ...pFiles], (err, output) => {
      if (err) reject(err);
      if (output) {
        resolve(JSON.parse(output) as JsonDescriptor);
      } else {
        resolve({
          nested: {},
        });
      }
    });
  });
};
