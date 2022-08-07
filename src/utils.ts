import { TsStructure } from "./interface";

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

export default getAllMethods;
