import { execSync } from "child_process";

export function generateProto(protoFiles: string[], buildDir: string): void {
  protoFiles.map(protoFile => {
    execSync([
      "yarn protoc",
      "--plugin=protoc-gen-as=./node_modules/.bin/as-proto-gen",
      `--as_out=${buildDir}`,
      protoFile
    ].join(" "));
  });
}

export default generateProto;