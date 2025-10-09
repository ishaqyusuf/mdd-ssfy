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
    public block: CommunityBlock
  ) {}

  generateBlockForm() {
    let rowBlocksArray: CommunityBlock["inputConfigs"][] = [[]];
    const rowBlocks: CommunityBlock["inputConfigs"][] = [];
    let rowSize = 0;
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
        const v = this.modelValues.find(
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
      if (colSize > 0)
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
          this.modelValues
            .filter((v) => rowUids.some((r) => v.uid.startsWith(`${r}-`)))
            .map((a) => a.uid.split("-")[1])
        )
      );
      for (let di = duplicates.length - 1; di >= 0; di--) {
        const dup = duplicates[di]!;
        const dupRow = row.map((b, i) => {
          const v = this.modelValues.find((f) => f.uid === `${b.uid}-${dup}`);
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
}
