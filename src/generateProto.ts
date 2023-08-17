import { execSync } from "child_process";
import { getFiles } from "./utils";

export function generateProto(protoDir: string): void {
  const protoFiles = getFiles(protoDir, ".proto");
  protoFiles.map((protoFile) => {
    console.log(protoFile);
    execSync(
      [
        "yarn protoc",
        "--plugin=protoc-gen-as=./node_modules/.bin/as-proto-gen",
        `--proto_path=${protoDir}`,
        `--as_out=${protoDir}`,
        protoFile,
        // `${path.parse(protoFiles[0]).dir}/*.proto`,
      ].join(" ")
    );
  });
}

export default generateProto;
