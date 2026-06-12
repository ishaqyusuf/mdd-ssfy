import { db } from "@gnd/db";
import { allocateReceivedInboundToBackorders } from "@gnd/sales/sales-fulfillment-plan";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
	allocateReceivedInboundToBackordersSchemaTask,
	type TaskName,
} from "../../schema";

const id: TaskName = "allocate-received-inbound-to-backorders";

export const allocateReceivedInboundToBackordersTask = schemaTask({
	id,
	schema: allocateReceivedInboundToBackordersSchemaTask,
	maxDuration: 300,
	queue: {
		concurrencyLimit: 2,
	},
	run: async (payload) => {
		return allocateReceivedInboundToBackorders(db, payload);
	},
});
