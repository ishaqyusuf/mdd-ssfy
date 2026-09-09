import { expect, it } from "bun:test";
import type { TransactionClient } from "@gnd/db";
import { projectApprovedHousePackageLine } from "./sales-adjustment-door-projection";
it("writes assigned IDs into the snapshot and reuses them on a repeated projection", async () => {
	const doors: Array<{ id: number; dimension: string; stepProductId: number }> =
		[];
	let creates = 0;
	const tx = {
		housePackageTools: {
			findUnique: async () => ({ id: 10, doorType: "Bifold" }),
			update: async () => ({}),
		},
		dykeSalesDoors: {
			findMany: async () => doors,
			updateMany: async () => ({}),
			update: async () => ({}),
			create: async ({
				data,
			}: { data: { dimension: string; stepProductId: number } }) => {
				creates++;
				const door = { ...data, id: 67561 };
				doors.push(door);
				return door;
			},
		},
	} as unknown as TransactionClient;
	const line = {
		qty: 2,
		lineTotal: 200,
		housePackageTool: {
			doors: [
				{
					id: null as number | null,
					dimension: "3080",
					stepProductId: 12,
					totalQty: 2,
					lineTotal: 200,
				},
			],
		},
	};
	const proposed = { lineItems: [line] };
	await projectApprovedHousePackageLine({
		tx,
		salesOrderId: 27166,
		salesOrderItemId: 50,
		line,
	});
	expect(proposed.lineItems[0]!.housePackageTool.doors[0]!.id).toBe(67561);
	await projectApprovedHousePackageLine({
		tx,
		salesOrderId: 27166,
		salesOrderItemId: 50,
		line,
	});
	expect(creates).toBe(1);
});
