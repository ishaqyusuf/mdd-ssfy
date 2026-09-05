import { describe, expect, test } from "bun:test";

import { getSalesPipelineSnapshots } from "../sales-pipeline-order";
import { updateSalesItemControlAction } from "./index";

describe("sales item-control rebuild audit retention", () => {
	test.each([false, true])(
		"rebuild (service-only: %s)",
		async (serviceOnly) => {
			const activeUid = serviceOnly ? "molding-81-77" : "item-81";
			type DeleteWhere = {
				uid?: { notIn?: string[] };
				assignments?: { none: Record<string, never> };
			};
			const controls = [
				{
					uid: activeUid,
					title: "Old title",
					deletedAt: new Date("2026-07-01T00:00:00.000Z") as Date | null,
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
					uid: "item-legacy-assigned",
					title: "Historical assignment control",
					produceable: true,
					shippable: true,
					deletedAt: null as Date | null,
					packingReportCount: 0,
					assignmentCount: 1,
				},
				{
					uid: "item-legacy-unreferenced",
					title: "Unreferenced legacy control",
					packingReportCount: 0,
				},
			];
			const assignment = {
				id: 501,
				salesItemControlUid: activeUid as string | null,
				updatedAt: new Date("2026-08-01T10:00:00.000Z"),
			};
			let deleteWhere: Record<string, unknown> | undefined;

			const db = {
				salesOrders: {
					findMany: async ({
						select,
					}: {
						select: { itemControls: { where: { deletedAt: null } } };
					}) => [
						{
							id: 91,
							orderId: "TEST-91",
							status: "open",
							prodStatus: null,
							deletedAt: null,
							archivedAt: null,
							grandTotal: 100,
							amountDue: 0,
							updatedAt: new Date("2026-09-05T00:00:00Z"),
							inventoryProjection: null,
							stat: [],
							completionRecords: [],
							assignments: [],
							deliveries: [],
							itemControls: controls
								.filter(
									(row) =>
										(row.deletedAt ?? null) ===
										select.itemControls.where.deletedAt,
								)
								.map((row) => ({ ...row, qtyControls: [] })),
						},
					],
					findFirstOrThrow: async () => ({
						id: 91,
						isDyke: serviceOnly,
						itemControls: [
							{
								uid: activeUid,
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
								formSteps: serviceOnly
									? [{ value: "Services", prodUid: "service" }]
									: [],
								housePackageTool: serviceOnly
									? { id: 77, doors: [], stepProduct: { name: "Installation" } }
									: null,
							},
						],
					}),
				},
				settings: {
					findFirst: async () => ({
						meta: {
							route: {
								service: { config: { production: false, shipping: false } },
							},
						},
					}),
				},
				orderItemProductionAssignments: {
					findMany: async () => [{ ...assignment }],
					updateMany: async ({ data }: { data: Record<string, unknown> }) => {
						Object.assign(assignment, data, {
							updatedAt: new Date("2026-09-05T06:24:21.000Z"),
						});
						return { count: 1 };
					},
					update: async ({ data }: { data: Record<string, unknown> }) => {
						Object.assign(assignment, data, {
							updatedAt: new Date("2026-09-05T06:24:22.000Z"),
						});
						return data;
					},
				},
				qtyControl: {
					deleteMany: async () => ({ count: 1 }),
					createMany: async () => ({ count: 1 }),
				},
				salesItemControl: {
					updateMany: async ({
						where,
						data,
					}: { where: DeleteWhere; data: { deletedAt: Date } }) => {
						const active = new Set(where.uid?.notIn ?? []);
						for (const control of controls) {
							if (!active.has(control.uid)) Object.assign(control, data);
						}
						return { count: 1 };
					},
					deleteMany: async ({ where }: { where: DeleteWhere }) => {
						deleteWhere = where;
						const active = new Set(where.uid?.notIn ?? []);
						const before = controls.length;
						for (let index = controls.length - 1; index >= 0; index--) {
							const control = controls[index];
							if (!control) continue;
							if (
								!active.has(control.uid) &&
								control.packingReportCount === 0 &&
								(!where.assignments || !control.assignmentCount)
							) {
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
				uid: { notIn: [activeUid] },
				packingReports: { none: {} },
				assignments: { none: {} },
			});
			expect(controls.map((control) => control.uid)).toEqual([
				activeUid,
				"item-legacy-referenced",
				"item-legacy-assigned",
			]);
			expect(controls[0]).toMatchObject({
				title: serviceOnly ? "Installation" : "Replacement door",
				produceable: !serviceOnly,
				shippable: !serviceOnly,
				deletedAt: null,
			});
			expect(
				controls.find((control) => control.uid === "item-legacy-assigned")
					?.deletedAt,
			).toBeInstanceOf(Date);
			expect(assignment).toEqual({
				id: 501,
				salesItemControlUid: activeUid,
				updatedAt: new Date("2026-08-01T10:00:00.000Z"),
			});
			const snapshot = (await getSalesPipelineSnapshots(db as never, [91])).get(
				91,
			);
			expect(snapshot?.production.applicability).toBe(
				serviceOnly ? "not_required" : "required",
			);
			expect(snapshot?.fulfillment.applicability).toBe(
				serviceOnly ? "not_required" : "required",
			);
		},
	);
});
