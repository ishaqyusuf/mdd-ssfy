import { CommunityBlock } from "../services/template-form-service";

type Grid = NonNullable<CommunityBlock["inputConfigs"][number]>;
export function duplicateRow(rowNo: number, grids: Grid[]) {
  // all items in the row
  const row = grids.filter((g) => g._formMeta.rowNo === rowNo);

  // find existing copies of this row (match uids like "xxx-1", "xxx-2")
  const baseUids = row.map((r) => r.uid.split("-")[0]);
  const existingCopies = grids
    .filter((g) => baseUids.includes(g.uid.split("-")[0]))
    .map((g) => Number(g.uid.split("-")[1]) || 0);

  const nextCopy =
    (existingCopies.length ? Math.max(...existingCopies) : 0) + 1;

  // shift all rows after rowNo down by +1
  const shifted = grids.map((g) =>
    g._formMeta.rowNo > rowNo
      ? {
          ...g,
          _formMeta: {
            ...g._formMeta,
            rowNo: g._formMeta.rowNo + 1,
          },
        }
      : g
  );

  // create the duplicated row with new rowNo
  const duplicated = row.map((g) => ({
    ...g,
    uid: `${g.uid.split("-")[0]}-${nextCopy}`,
    _formMeta: {
      ...g._formMeta,
      rowNo: rowNo + 1,
    },
  }));

  // insert duplicate row after original
  const before = shifted.filter((g) => g._formMeta.rowNo <= rowNo);
  const after = shifted.filter((g) => g._formMeta.rowNo > rowNo);

  return [...before, ...duplicated, ...after];
}
export function deleteCopiedRow(rowNo: number, grids: Grid[]) {
  // remove the row
  const filtered = grids.filter((g) => g._formMeta.rowNo !== rowNo);

  // shift rows after deleted one
  return filtered.map((g) =>
    g._formMeta.rowNo > rowNo
      ? {
          ...g,
          _formMeta: {
            ...g._formMeta,
            rowNo: g._formMeta.rowNo - 1,
          },
        }
      : g
  );
}
export function moveCopiedRow(
  rowNo: number,
  dir: "up" | "down",
  grids: Grid[]
) {
  // find all copied rows by checking if uid has a "-number" suffix
  const copiedRowNos = Array.from(
    new Set(
      grids
        .filter((g) => /\-\d+$/.test(g.uid)) // uid ends with -<num>
        .map((g) => g._formMeta.rowNo)
    )
  ).sort((a, b) => a - b);

  if (!copiedRowNos.includes(rowNo)) {
    // not a copied row → can't move
    return grids;
  }

  // index of this row in copied rows
  const idx = copiedRowNos.indexOf(rowNo);
  let targetRowNo: number | undefined;

  if (dir === "up" && idx > 0) targetRowNo = copiedRowNos[idx - 1];
  if (dir === "down" && idx < copiedRowNos.length - 1)
    targetRowNo = copiedRowNos[idx + 1];

  if (targetRowNo === undefined) return grids; // no move possible

  // swap rowNo values between the current and target row
  return grids.map((g) => {
    if (g._formMeta.rowNo === rowNo) {
      return { ...g, _formMeta: { ...g._formMeta, rowNo: targetRowNo! } };
    }
    if (g._formMeta.rowNo === targetRowNo) {
      return { ...g, _formMeta: { ...g._formMeta, rowNo } };
    }
    return g;
  });
}
