import { execSync } from "child_process";
import path from "path";

export function compileWasm(projectDir: string, buildDir:string): void {
  const indexFile = path.join(buildDir,"index.ts");
  execSync(
      [
        "yarn node ./node_modules/assemblyscript/bin/asc",
        indexFile,
        "--target debug",
        "--use abort=",
        "--use BUILD_FOR_TESTING=1",
        "--disable",
        "sign-extension",
        `--config ${path.join(projectDir, "asconfig.json")}`,
      ].join(" ")
    );
}

export default compileWasm;
