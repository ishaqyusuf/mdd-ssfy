import { schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import { runFullInventoryImport } from "@gnd/inventory";
import {
  runFullInventoryImportTaskSchema,
  type TaskName,
} from "../../schema";

const runNowId: TaskName = "run-inventory-full-import-now";
const runTestId: TaskName = "run-inventory-full-import-test";

export const runInventoryFullImportNow = schemaTask({
  id: runNowId,
  schema: runFullInventoryImportTaskSchema,
  maxDuration: 1800,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (input) => {
    return runFullInventoryImport(db as any, {
      ...input,
      source: "job",
    });
  },
});

export const runInventoryFullImportTest = schemaTask({
  id: runTestId,
  schema: runFullInventoryImportTaskSchema,
  maxDuration: 1800,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (input) => {
    return runFullInventoryImport(db as any, {
      ...input,
      compare: true,
      reset: false,
      source: "job",
    });
  },
});
