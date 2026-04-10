import type { Db } from "@gnd/db";
import { runInventoryImport } from "../import/inventory-import-service";
import { inventoryImportRunSchema, type InventoryImportRun } from "../../schema";
import { resetInventorySystem } from "../../inventory";

export async function runFullInventoryImport(
  db: Db,
  input: InventoryImportRun,
) {
  const payload = inventoryImportRunSchema.parse(input);
  const startedAt = new Date();

  if (payload.reset) {
    await resetInventorySystem(db);
  }

  const stepIds = payload.categoryId
    ? [payload.categoryId]
    : (
        await db.dykeSteps.findMany({
          distinct: "title",
          select: { id: true },
          orderBy: { id: "asc" },
        })
      ).map((step) => step.id);

  const runs: Awaited<ReturnType<typeof runInventoryImport>>[] = [];
  for (const stepId of stepIds) {
    runs.push(
      await runInventoryImport(db, {
        ...payload,
        categoryId: stepId,
      }),
    );
  }

  return {
    startedAt,
    finishedAt: new Date(),
    source: payload.source,
    strategy: payload.strategy,
    compare: payload.compare,
    reset: payload.reset,
    totalSteps: stepIds.length,
    runs,
  };
}
