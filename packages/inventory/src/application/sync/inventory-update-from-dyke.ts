import type { Db } from "@gnd/db";
import {
  runInventoryImport,
  type InventoryImportComparison,
  type InventoryImportExecution,
} from "../import/inventory-import-service";
import type { InventoryImportRun } from "../../schema";
import { resolveActiveInventoryImportScope } from "../import/resolve-active-inventory-import-scope";

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
  const scope = await resolveActiveInventoryImportScope(db);
  if (!scope.activeStepIds.includes(input.stepId)) {
    const step = await db.dykeSteps.findUnique({
      where: { id: input.stepId },
      select: { uid: true },
    });
    return {
      strategy: input.strategy ?? "optimized",
      categoryId: input.stepId,
      result: {
        stepData: {
          step: {
            uid: step?.uid ?? null,
          },
        },
        data: {
          skipped: true,
          reason: "step_outside_active_sales_settings_scope",
          scope: "active",
          tables: {},
        },
      },
    };
  }
  return runInventoryImport(db, {
    categoryId: input.stepId,
    scope: "active",
    compare: input.compare ?? false,
    reset: false,
    strategy: input.strategy ?? "optimized",
    source: input.source ?? "event",
  });
}
