import { RenturnTypeAsync } from "@gnd/utils";
import {
  getCommunityBlockSchema,
  getCommunitySchema,
  getModelTemplate,
} from "../community-template-schemas";

type Schema = RenturnTypeAsync<typeof getCommunitySchema>;
type ModelTemplate = RenturnTypeAsync<typeof getModelTemplate>;
type CommunityBlock = RenturnTypeAsync<typeof getCommunityBlockSchema>;
export class TemplateFormService {
  constructor(
    public schema: Schema,
    public modelTemplate: ModelTemplate,
    public block: CommunityBlock
  ) {}

  generateBlockForm() {
    const rowBlocksArray: CommunityBlock["inputConfigs"][] = [[]];
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

    for (let index = rowBlocksArray.length - 1; index >= 0; index--) {
      const _rba = rowBlocksArray[index]!;
      const row = _rba?.map((b, i) => {
        const v = this.modelTemplate.values.find((f) => f.uid === b.uid);
        b._formMeta.formUid = v?.uid!;
        b._formMeta.inventoryId = v?.inventoryId!;
        b._formMeta.rowEdge = i == _rba.length - 1;
        b._formMeta.valueId = v?.id;
        b._formMeta.value = v?.value || 1;
        return b;
      });
      rowBlocks.unshift([...row]);
      const rowUids = row.map((a) => a.uid);
      const duplicates = Array.from(
        new Set(
          this.modelTemplate.values
            .filter((v) => rowUids.some((r) => v.uid.startsWith(`${r}-`)))
            .map((a) => a.uid.split("-")[1])
        )
      );
      for (let di = duplicates.length - 1; di >= 0; di--) {
        const dup = duplicates[di]!;
        const dupRow = row.map((b, i) => {
          const v = this.modelTemplate.values.find(
            (f) => f.uid === `${b.uid}-${dup}`
          );
          return {
            ...b,
            _formMeta: {
              ...b._formMeta,
              formUid: v?.uid!,
              inventoryId: v?.inventoryId!,
              rowEdge: i == row.length - 1,
              valueId: v?.id,
              value: v?.value || 1,
              duplicateKey: dup, // keep track of which duplicate row this came from
            },
          };
        });
        rowBlocks.unshift([...dupRow]);
      }
    }
    return rowBlocks.flat();
  }
}
