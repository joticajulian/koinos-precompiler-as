import { execSync } from "child_process";
import path from "path";

export function generateProto(protoFiles: string[], buildDir: string): void {
  protoFiles.map((protoFile) => {
    console.log(protoFile);
    execSync(
      [
        "yarn protoc",
        "--plugin=protoc-gen-as=./node_modules/.bin/as-proto-gen",
        `--proto_path=${path.parse(protoFiles[0]).dir}`,
        `--as_out=${buildDir}`,
        protoFile,
        // `${path.parse(protoFiles[0]).dir}/*.proto`,
      ].join(" ")
    );
  });
}

export default generateProto;
