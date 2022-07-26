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

export function combineTsStructures(
  ts: TsStructure,
  entryPoints: string[] = [],
  proto: TsStructure["proto"] = [],
  events: TsStructure["events"] = []
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
  allMethods.push({
    ...ts,
    methods: methodsToAdd,
    proto: protosToAdd,
    events: eventsToAdd,
  });
  ts.methods.forEach((m) => entryPoints.push(m.entryPoint));
  ts.proto.forEach((p) => proto.push(p));
  ts.extends.forEach((e) => {
    allMethods.push(...combineTsStructures(e, entryPoints, proto, events));
  });

  return allMethods;
}

export const generateJsonDescriptor = async (
  protoFiles: string | string[]
): Promise<JsonDescriptor> => {
  return new Promise((resolve, reject) => {
    const pFiles = Array.isArray(protoFiles) ? protoFiles : [protoFiles];
    const protoDir = path.parse(pFiles[0]).dir;
    pbjs.main(
      ["--keep-case", "--path", protoDir, "--target", "json", ...pFiles],
      (err, output) => {
        if (err) reject(err);
        if (output) {
          const jsonDescriptor = JSON.parse(output) as JsonDescriptor;
          delete jsonDescriptor.nested.koinos;
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
