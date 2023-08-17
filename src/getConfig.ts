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
  const koinosProtoDir = config.koinosProtoDir
    ? path.join(dir, config.koinosProtoDir)
    : path.join(dir, "node_modules/koinos-precompiler-as/koinos-proto");

  const files = config.files.map((f) => path.join(buildDir, f));
  const protoPaths = config.protoPaths
    ? config.protoPaths.map((p) => ({ ...p, path: path.join(dir, p.path) }))
    : [];

  return {
    class: config.class,
    sourceDir,
    buildDir,
    files,
    protoPaths,
    koinosProtoDir,
  };
}

export default getConfig;
