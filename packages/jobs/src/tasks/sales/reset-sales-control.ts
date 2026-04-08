import { TaskName } from "../../schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  ControlRepairService,
  resetSalesControlSchema,
  resolveResetSalesControlCommand,
} from "@gnd/sales";
import { db } from "@gnd/db";

export const resetSalesControl = schemaTask({
  id: "reset-sales-control" as TaskName,
  schema: resetSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    const repairCommand = resolveResetSalesControlCommand();
    const repairService = new ControlRepairService(db as any);
    const repairResult = await repairService.rebuildFromSource(
      input.meta.salesId,
      input.meta.authorId,
    );
    const reconciliation = await repairService.reconcileOrder(
      input.meta.salesId,
    );
    return {
      ok: true,
      salesId: input.meta.salesId,
      repairCommand,
      repairResult,
      reconciliation,
      repairedBy: {
        authorId: input.meta.authorId,
        authorName: input.meta.authorName,
      },
    };
  },
});
