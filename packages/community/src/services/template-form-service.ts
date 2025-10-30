import { generateRandomString, RenturnTypeAsync, sum } from "@gnd/utils";
import {
  getCommunityBlockSchema,
  getCommunitySchema,
  getModelTemplate,
} from "../community-template-schemas";

export type SchemaData = RenturnTypeAsync<typeof getCommunitySchema>;
export type ModelTemplateValues = RenturnTypeAsync<
  typeof getModelTemplate
>["values"];
export type CommunityBlock = RenturnTypeAsync<typeof getCommunityBlockSchema>;
export class TemplateFormService {
  constructor(
    public schema: SchemaData,
    public modelValues: ModelTemplateValues,
    public block: CommunityBlock,
    public printMode: Boolean
  ) {}

  generateBlockForm() {
    let rowBlocksArray: CommunityBlock["inputConfigs"][] = [[]];
    const rowBlocks: CommunityBlock["inputConfigs"][] = [];
    let rowSize = 0;
    const blockConfigIds = new Set([
      ...this.block.inputConfigs.map((a) => a.communityTemplateBlockConfigId),
    ]);
    const modelValues = this.modelValues.filter((a) =>
      blockConfigIds.has(a.inputConfig.communityTemplateBlockConfigId)
    );
    this.block.inputConfigs.map((config) => {
      // config.columnSize
      if (!config.columnSize) config.columnSize = 4;
      if (config.columnSize! + rowSize > 4) {
        // next
        rowSize = 0;
        rowBlocksArray.push([]);
      }
      rowSize += config.columnSize!;
      const blockIndex = rowBlocksArray.length - 1;
      rowBlocksArray[blockIndex]?.push(config);
    });
    // rowBlocksArray = rowBlocksArray.map((l) => {
    //   const colSize = 4 - sum(l, "columnSize");
    //   if (colSize > 0)
    //     l.push({
    //       columnSize: colSize,
    //       id: -1,
    //       _formMeta: {},
    //     } as any);
    //   return l;
    // });
    for (let index = rowBlocksArray.length - 1; index >= 0; index--) {
      const _rba = rowBlocksArray[index]!;
      const row = _rba?.map((b, i) => {
        const v = modelValues.find(
          (f) => f.uid === b.uid && f.inputConfig.id === b.id
        );
        b._formMeta.formUid = b?.uid!;
        b._formMeta.inventoryId = v?.inventoryId!;
        b._formMeta.selection = {
          id: String(v?.inventoryId!),
          label: v?.inventory?.name,
        } as any;
        b._formMeta.rowEdge = i == _rba.length - 1;
        b._formMeta.templateValueId = v?.id as any;
        b._formMeta.value = v?.value; // || v?.inventoryId! ? 1 : null;
        return b;
      });
      const colSize = 4 - sum(row, "columnSize");
      // Remove during print.
      if (colSize > 0 && !this.printMode)
        row.push({
          columnSize: colSize,
          id: -1,
          _formMeta: {},
          uid: generateRandomString(4),
        } as any);
      rowBlocks.unshift([...row]);
      const rowUids = row.map((a) => a.uid);
      const duplicates = Array.from(
        new Set(
          modelValues
            .filter((v) => rowUids.some((r) => v.uid.startsWith(`${r}-`)))
            .map((a) => a.uid.split("-")[1])
        )
      );
      for (let di = duplicates.length - 1; di >= 0; di--) {
        const dup = duplicates[di]!;
        const dupRow = row.map((b, i) => {
          const v = modelValues.find((f) => f.uid === `${b.uid}-${dup}`);
          return {
            ...b,
            _formMeta: {
              formUid: `${b.uid}-${dup}`,
              rowEdge: i == row.length - 1,
              inventoryId: v?.inventoryId!,
              value: v?.value, // || v?.inventoryId! ? 1 : null,
              templateValueId: v?.id,
              selection: {
                id: String(v?.inventoryId!),
                label: v?.inventory?.name,
              },
            },
          };
        });
        rowBlocks.unshift([...dupRow] as any);
      }
    }
    return rowBlocks
      .map((a, rowNo) =>
        a.map((b, bi) => ({
          ...b,
          // index: bi,
          _formMeta: {
            ...b._formMeta,
            rowNo,
          },
        }))
      )
      .flat()
      .map((a, index) => ({
        ...a,
        index,
      }));
  }
  extendEdgeCells(cells: ReturnType<typeof this.generateBlockForm>) {
    const rowGroups = cells.reduce((acc, cell) => {
      if (!acc[cell._formMeta.rowNo]) {
        acc[cell._formMeta!.rowNo] = [];
      }
      acc[cell._formMeta!.rowNo]?.push(cell);
      return acc;
    }, {} as Record<number, typeof cells>);
    Object.values(rowGroups).forEach((row) => {
      const sum = row.reduce((total, cell) => total + cell?.columnSize!, 0);

      if (sum < 4) {
        const remainder = 4 - sum;
        const lastCell: any = row[row.length - 1];
        lastCell.columnSize += remainder;
      }
    });
  }
}
