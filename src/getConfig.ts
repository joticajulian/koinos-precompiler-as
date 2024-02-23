import path from "path";
import { PrecompilerConfig } from "./interface";

export function getConfig(configFile: string): PrecompilerConfig {
  let configFileComplete = configFile;
  if (!configFile.endsWith(".js"))
    configFileComplete = path.join(configFile, "koinos.config.js");
  const fullPathConfigFile = path.join(process.cwd(), configFileComplete);
  const { dir } = path.parse(fullPathConfigFile);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(fullPathConfigFile) as PrecompilerConfig;
  const sourceDir = config.sourceDir
    ? path.join(dir, config.sourceDir)
    : path.join(dir, "assembly");
  const buildDir = config.buildDir
    ? path.join(dir, config.buildDir)
    : path.join(dir, "build");

  const protoImport = config.protoImport
    ? config.protoImport.map((p) => ({ ...p, path: path.join(dir, p.path) }))
    : [];
  let filesImport = config.filesImport
    ? config.filesImport.map((f) => ({ ...f, path: path.join(dir, f.path) }))
    : [];
  const localFiles = config.files.map((f) => ({
    path: path.join(buildDir, f),
    dependency: "",
  }));
  const files = config.files.map((f) => path.join(buildDir, f));

  filesImport = [...localFiles, ...filesImport];

  return {
    ...config,
    sourceDir,
    buildDir,
    files,
    filesImport,
    protoImport,
  };
}

export default getConfig;
