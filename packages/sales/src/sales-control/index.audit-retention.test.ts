import { describe, expect, test } from "bun:test";

import { updateSalesItemControlAction } from "./index";

describe("sales item-control rebuild audit retention", () => {
	test("updates active controls, preserves referenced stale controls, and removes only unreferenced stale controls", async () => {
		type DeleteWhere = {
			uid?: { notIn?: string[] };
		};
		const controls = [
			{
				uid: "item-81",
				title: "Old title",
				subtitle: null,
				produceable: false,
				shippable: false,
				packingReportCount: 1,
			},
			{
				uid: "item-legacy-referenced",
				title: "Referenced legacy control",
				packingReportCount: 1,
			},
			{
				uid: "item-legacy-unreferenced",
				title: "Unreferenced legacy control",
				packingReportCount: 0,
			},
		];
		const restoredAssignments: Array<Record<string, unknown>> = [];
		let deleteWhere: Record<string, unknown> | undefined;

		const db = {
			salesOrders: {
				findFirstOrThrow: async () => ({
					id: 91,
					isDyke: false,
					itemControls: [
						{
							uid: "item-81",
							salesId: 91,
							orderItemId: 81,
							deletedAt: null,
							sectionTitle: null,
							title: "Old title",
							subtitle: null,
							produceable: false,
							shippable: false,
							qtyControls: [],
						},
					],
					stat: null,
					deliveries: [],
					assignments: [],
					items: [
						{
							id: 81,
							multiDykeUid: null,
							dykeProduction: false,
							swing: "LH",
							qty: 2,
							description: "Replacement door",
							dykeDescription: null,
							formSteps: [],
							housePackageTool: null,
						},
					],
				}),
			},
			settings: {
				findFirst: async () => null,
			},
			orderItemProductionAssignments: {
				findMany: async () => [{ id: 501, salesItemControlUid: "item-81" }],
				updateMany: async () => ({ count: 1 }),
				update: async ({ data }: { data: Record<string, unknown> }) => {
					restoredAssignments.push(data);
					return data;
				},
			},
			qtyControl: {
				deleteMany: async () => ({ count: 1 }),
				createMany: async () => ({ count: 1 }),
			},
			salesItemControl: {
				deleteMany: async ({ where }: { where: DeleteWhere }) => {
					deleteWhere = where;
					const active = new Set(where.uid?.notIn ?? []);
					const before = controls.length;
					for (let index = controls.length - 1; index >= 0; index--) {
						const control = controls[index];
						if (!control) continue;
						if (!active.has(control.uid) && control.packingReportCount === 0) {
							controls.splice(index, 1);
						}
					}
					return { count: before - controls.length };
				},
				upsert: async ({
					where,
					update,
				}: {
					where: { uid: string };
					update: Record<string, unknown>;
				}) => {
					const control = controls.find((row) => row.uid === where.uid);
					if (!control) throw new Error(`Missing control ${where.uid}`);
					Object.assign(control, update);
					return control;
				},
			},
		};

		await updateSalesItemControlAction(db as never, 91);

		expect(deleteWhere).toEqual({
			salesId: 91,
			uid: { notIn: ["item-81"] },
			packingReports: { none: {} },
		});
		expect(controls.map((control) => control.uid)).toEqual([
			"item-81",
			"item-legacy-referenced",
		]);
		expect(controls[0]).toMatchObject({
			title: "Replacement door",
			subtitle: "LH",
			produceable: true,
			shippable: true,
		});
		expect(restoredAssignments).toEqual([{ salesItemControlUid: "item-81" }]);
	});
});
