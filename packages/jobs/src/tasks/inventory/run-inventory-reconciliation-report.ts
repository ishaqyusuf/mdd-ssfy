import { db } from "@gnd/db";
import { getInventoryReconciliationReport } from "@gnd/sales/inventory-reconciliation-report";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
	inventoryReconciliationReportSchemaTask,
	type TaskName,
} from "../../schema";

const id: TaskName = "run-inventory-reconciliation-report";

export const runInventoryReconciliationReportTask = schemaTask({
	id,
	schema: inventoryReconciliationReportSchemaTask,
	maxDuration: 300,
	queue: {
		concurrencyLimit: 2,
	},
	run: async (payload) => {
		return getInventoryReconciliationReport(db, payload);
	},
});
