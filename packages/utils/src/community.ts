export function getPivotModel(model) {
  if (!model) return "";
  const pivotM = model
    .toLowerCase()
    .split(" ")
    .flatMap((part) => part.split("/"))
    .filter(Boolean)
    .filter((v) => !["lh", "rh", "l", "r"].includes(v))
    .join(" ");
  return pivotM;
}
