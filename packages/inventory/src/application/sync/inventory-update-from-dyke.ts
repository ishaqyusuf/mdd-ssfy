import type { Db } from "@gnd/db";
import {
  runInventoryImport,
  type InventoryImportComparison,
  type InventoryImportExecution,
} from "../import/inventory-import-service";
import type { InventoryImportRun } from "../../schema";

export type InventoryUpdateFromDykeInput = {
  stepId: number;
  compare?: boolean;
  strategy?: InventoryImportRun["strategy"];
  source?: InventoryImportRun["source"];
};

export async function inventoryUpdateFromDyke(
  db: Db,
  input: InventoryUpdateFromDykeInput,
): Promise<InventoryImportExecution | InventoryImportComparison> {
  return runInventoryImport(db, {
    categoryId: input.stepId,
    compare: input.compare ?? false,
    reset: false,
    strategy: input.strategy ?? "optimized",
    source: input.source ?? "event",
  });
}
