import { execSync } from "child_process";
import path from "path";
import { getFiles } from "./utils";

export function generateProto(protoDir: string): void {
  let protocFile = path.join(__dirname, "../../.bin/as-proto-gen");
  if (process.platform === "win32") {
    protocFile = `${protocFile.replace(/\//g, "\\")}.cmd`;
  }

  const protoFiles = getFiles(protoDir, ".proto");
  protoFiles.map((protoFile) => {
    console.log(protoFile);
    execSync(
      [
        "yarn protoc",
        `--plugin=protoc-gen-as=${protocFile}`,
        `--proto_path=${protoDir}`,
        `--as_out=${protoDir}`,
        protoFile,
        // `${path.parse(protoFiles[0]).dir}/*.proto`,
      ].join(" ")
    );
  });
}

export default generateProto;
