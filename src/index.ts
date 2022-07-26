import fs from "fs";
import path from "path";
import * as tsstruct from "ts-structure-parser";
import { parse } from "comment-parser";

const filePath = path.join(__dirname, "../tests/assets/testfile.ts");
const decls = fs.readFileSync(filePath, "utf8");
console.log(tsstruct);
const jsonStructure = tsstruct.parseStruct(decls, {}, filePath);
console.log(jsonStructure);
const c = parse(jsonStructure.classes[0].methods[0].text);
console.log(c);
