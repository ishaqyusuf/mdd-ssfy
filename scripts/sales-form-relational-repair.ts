#!/usr/bin/env bun

import { calculateSalesFormSummary } from "../packages/sales/src/sales-form/domain/costing";
import {
	getSalesDoorActiveIdentity,
	normalizeSalesDoorDimension,
} from "../packages/sales/src/sales-form/domain/door-identity";
import {
	roundMoney,
	sumMoney,
} from "../packages/sales/src/payment-system/domain/money";

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";
const MIGRATION_VERSION = "sales-form-relational-v1";

type Options = {
	apply: boolean;
	confirmReview: boolean;
	salesOrderIds: number[] | null;
	afterId: number | null;
	limit: number;
};

function parseArgs(argv: string[]): Options {
	const options: Options = {
		apply: false,
		confirmReview: false,
		salesOrderIds: null,
		afterId: null,
		limit: 250,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--apply") options.apply = true;
		else if (arg === "--confirm-review") options.confirmReview = true;
		else if (arg === "--sales-order-ids") {
			options.salesOrderIds = String(argv[index + 1] || "")
				.split(",")
				.map(Number)
				.filter((id) => Number.isInteger(id) && id > 0);
			index += 1;
		} else if (arg.startsWith("--sales-order-ids=")) {
			options.salesOrderIds = arg
				.slice("--sales-order-ids=".length)
				.split(",")
				.map(Number)
				.filter((id) => Number.isInteger(id) && id > 0);
		} else if (arg === "--after-id") {
			options.afterId = Number(argv[index + 1] || 0) || null;
			index += 1;
		} else if (arg.startsWith("--after-id=")) {
			options.afterId = Number(arg.slice("--after-id=".length)) || null;
		} else if (arg === "--limit") {
			options.limit = Math.min(
				1000,
				Math.max(1, Number(argv[index + 1] || 250)),
			);
			index += 1;
		} else if (arg.startsWith("--limit=")) {
			options.limit = Math.min(
				1000,
				Math.max(1, Number(arg.slice("--limit=".length) || 250)),
			);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (
		options.apply &&
		(!options.confirmReview || !options.salesOrderIds?.length)
	) {
		throw new Error(
			"--apply requires --confirm-review and explicit --sales-order-ids.",
		);
	}
	return options;
}

function record(value: unknown): Record<string, any> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, any>)
		: {};
}

function scoreDoor(row: any) {
	const meta = record(row.meta);
	return [
		Number(meta.baseUnitPrice || 0) > 0,
		Number(meta.doorSalesUnitPrice || 0) > 0,
		Number(row.jambSizePrice || 0) > 0,
		Number(row.unitPrice || 0) > 0,
		Number(row.lineTotal || 0) > 0,
	].filter(Boolean).length;
}

function groupDuplicateDoors(doors: any[]) {
	const groups = new Map<string, any[]>();
	for (const door of doors) {
		const identity = getSalesDoorActiveIdentity(door);
		groups.set(identity, [...(groups.get(identity) || []), door]);
	}
	return [...groups.entries()].filter(([, rows]) => rows.length > 1);
}

function groupDuplicateFormSteps(steps: any[]) {
	const groups = new Map<string, any[]>();
	for (const step of steps) {
		const identity = [
			Number(step.stepId || 0),
			Number(step.componentId || 0),
			String(step.prodUid || "").trim(),
		].join("|");
		groups.set(identity, [...(groups.get(identity) || []), step]);
	}
	return [...groups.entries()].filter(([, rows]) => rows.length > 1);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;
	const { db } = await import("../packages/db/src/index.ts");
	try {
		const orders = await db.salesOrders.findMany({
			where: {
				deletedAt: null,
				...(options.salesOrderIds?.length
					? { id: { in: options.salesOrderIds } }
					: options.afterId
						? { id: { gt: options.afterId } }
						: {}),
			},
			orderBy: { id: "asc" },
			take: options.salesOrderIds?.length ? undefined : options.limit,
			select: {
				id: true,
				updatedAt: true,
				orderId: true,
				type: true,
				status: true,
				taxPercentage: true,
				meta: true,
				customerProfileId: true,
				salesProfile: { select: { coefficient: true } },
				extraCosts: {
					select: { type: true, amount: true, taxxable: true },
				},
				payments: {
					where: { deletedAt: null },
					select: { amount: true },
				},
				items: {
					where: { deletedAt: null },
					select: {
						id: true,
						qty: true,
						rate: true,
						total: true,
						formSteps: {
							where: { deletedAt: null },
							select: {
								id: true,
								stepId: true,
								componentId: true,
								prodUid: true,
								value: true,
								qty: true,
								price: true,
								basePrice: true,
								meta: true,
							},
						},
						housePackageTool: {
							select: {
								id: true,
								doors: {
									where: { deletedAt: null },
									orderBy: { id: "asc" },
									select: {
										id: true,
										dimension: true,
										stepProductId: true,
										jambSizePrice: true,
										doorPrice: true,
										casingPrice: true,
										unitPrice: true,
										lineTotal: true,
										lhQty: true,
										rhQty: true,
										totalQty: true,
										meta: true,
									},
								},
							},
						},
					},
				},
			},
		});

		const duplicateDoorFindings = orders.flatMap((order) =>
			order.items.flatMap((item) =>
				groupDuplicateDoors(item.housePackageTool?.doors || []).map(
					([identity, rows]) => ({
						kind: "duplicate-active-door" as const,
						orderId: order.id,
						salesNo: order.orderId,
						type: order.type,
						status: order.status,
						itemId: item.id,
						hptId: item.housePackageTool!.id,
						identity,
						rowIds: rows.map((row) => row.id),
					}),
				),
			),
		);
		const duplicateStepFindings = orders.flatMap((order) =>
			order.items.flatMap((item) =>
				groupDuplicateFormSteps(item.formSteps || []).map(
					([identity, rows]) => ({
						kind: "duplicate-active-form-step" as const,
						orderId: order.id,
						salesNo: order.orderId,
						type: order.type,
						status: order.status,
						itemId: item.id,
						identity,
						rowIds: rows.map((row) => row.id),
					}),
				),
			),
		);
		const duplicateFindings = [
			...duplicateDoorFindings,
			...duplicateStepFindings,
		];
		const approvedSnapshotFindings = orders.flatMap((order) => {
			const persisted = record(record(order.meta).newSalesForm);
			if (
				!persisted.approvedAdjustmentId ||
				!Array.isArray(persisted.lineItems)
			) {
				return [];
			}
			const snapshotTotal = roundMoney(
				persisted.lineItems.reduce(
					(total: number, line: any) => total + Number(line?.lineTotal || 0),
					0,
				),
			);
			const relationalTotal = sumMoney(
				order.items.map((item) => Number(item.total || 0)),
			);
			return Math.abs(snapshotTotal - relationalTotal) >= 0.01
				? [
						{
							kind: "approved-adjustment-not-projected" as const,
							orderId: order.id,
							salesNo: order.orderId,
							type: order.type,
							status: order.status,
							approvedAdjustmentId: String(persisted.approvedAdjustmentId),
							snapshotTotal,
							relationalTotal,
						},
					]
				: [];
		});
		const findings = [...duplicateFindings, ...approvedSnapshotFindings];
		console.log(
			JSON.stringify(
				{
					mode: options.apply ? "apply" : "audit",
					findings,
					nextAfterId:
						!options.salesOrderIds?.length && orders.length === options.limit
							? orders.at(-1)?.id || null
							: null,
				},
				null,
				2,
			),
		);
		if (!options.apply) return;

		for (const candidate of orders) {
			const orderFindings = duplicateFindings.filter(
				(finding) => finding.orderId === candidate.id,
			);
			if (!orderFindings.length) continue;
			const isOpenQuote =
				candidate.type === "quote" &&
				["draft", "open", "pending"].includes(
					String(candidate.status || "").toLowerCase(),
				);
			if (!isOpenQuote) {
				console.warn(
					`review-only ${candidate.orderId}: committed/non-open sale`,
				);
				continue;
			}

			await db.$transaction(
				async (tx) => {
					const order = await tx.salesOrders.findFirst({
						where: {
							id: candidate.id,
							updatedAt: candidate.updatedAt,
							deletedAt: null,
							type: "quote",
							status: {
								in: ["Draft", "draft", "Open", "open", "Pending", "pending"],
							},
						},
						include: {
							salesProfile: true,
							extraCosts: true,
							payments: { where: { deletedAt: null } },
							taxes: {
								where: { deletedAt: null },
								include: { taxConfig: true },
							},
							items: {
								where: { deletedAt: null },
								include: {
									formSteps: { where: { deletedAt: null } },
									housePackageTool: {
										include: {
											doors: {
												where: { deletedAt: null },
												orderBy: { id: "asc" },
											},
										},
									},
								},
							},
						},
					});
					if (!order) {
						throw new Error(
							`repair-conflict ${candidate.orderId}: document changed or left open-quote lifecycle`,
						);
					}
					const liveDoorFindings = order.items.flatMap((item) =>
						groupDuplicateDoors(item.housePackageTool?.doors || []).map(
							([identity, rows]) => ({
								orderId: order.id,
								salesNo: order.orderId,
								type: order.type,
								status: order.status,
								itemId: item.id,
								hptId: item.housePackageTool!.id,
								identity,
								rowIds: rows.map((row) => row.id),
							}),
						),
					);
					const liveStepFindings = order.items.flatMap((item) =>
						groupDuplicateFormSteps(item.formSteps || []).map(
							([identity, rows]) => ({
								orderId: order.id,
								salesNo: order.orderId,
								type: order.type,
								status: order.status,
								itemId: item.id,
								identity,
								rowIds: rows.map((row) => row.id),
							}),
						),
					);
					const liveFindings = [...liveDoorFindings, ...liveStepFindings];
					if (!liveFindings.length) return;
					const before = liveFindings.map((finding) => ({ ...finding }));
					const itemTotals = new Map(
						order.items.map((item) => [item.id, Number(item.total || 0)]),
					);
					for (const item of order.items) {
						for (const [, rows] of groupDuplicateFormSteps(item.formSteps || [])) {
							const stable = [...rows].sort((a, b) => a.id - b.id)[0]!;
							const source = [...rows].sort((a, b) => b.id - a.id)[0]!;
							await tx.dykeStepForm.update({
								where: { id: stable.id },
								data: {
									componentId: source.componentId,
									prodUid: source.prodUid,
									value: source.value,
									qty: source.qty,
									price: source.price,
									basePrice: source.basePrice,
									meta: source.meta,
								},
							});
							await tx.dykeStepForm.updateMany({
								where: {
									id: {
										in: rows
											.filter((row) => row.id !== stable.id)
											.map((row) => row.id),
									},
								},
								data: { deletedAt: new Date() },
							});
						}
						const hpt = item.housePackageTool;
						if (!hpt) continue;
						const groups = groupDuplicateDoors(hpt.doors || []);
						if (!groups.length) continue;
						const retainedRows = [...hpt.doors];
						for (const [, rows] of groups) {
							const stable = [...rows].sort((a, b) => a.id - b.id)[0]!;
							const pricing = [...rows].sort(
								(a, b) => scoreDoor(b) - scoreDoor(a) || b.id - a.id,
							)[0]!;
							const retainedQty = Math.max(
								0,
								Number(pricing.totalQty || 0) ||
									Number(pricing.lhQty || 0) + Number(pricing.rhQty || 0),
							);
							const retainedLineTotal = roundMoney(
								Number(pricing.unitPrice || 0) * retainedQty,
							);
							const coefficient = Number(order.salesProfile?.coefficient || 0);
							const pricingMeta = record(pricing.meta);
							const baseUnitPrice =
								Number(pricingMeta.baseUnitPrice || 0) > 0
									? Number(pricingMeta.baseUnitPrice)
									: coefficient > 0
										? roundMoney(
												Number(pricing.jambSizePrice || 0) * coefficient,
											)
										: 0;
							await tx.dykeSalesDoors.update({
								where: { id: stable.id },
								data: {
									activeIdentity: `${hpt.id}|${getSalesDoorActiveIdentity({
										...pricing,
										dimension: normalizeSalesDoorDimension(pricing.dimension),
									})}`,
									dimension: normalizeSalesDoorDimension(pricing.dimension),
									stepProductId: pricing.stepProductId,
									jambSizePrice: Number(pricing.jambSizePrice || 0),
									doorPrice: Number(pricing.doorPrice || 0),
									casingPrice: Number(pricing.casingPrice || 0),
									unitPrice: Number(pricing.unitPrice || 0),
									lineTotal: retainedLineTotal,
									lhQty: Number(pricing.lhQty || 0),
									rhQty: Number(pricing.rhQty || 0),
									totalQty: retainedQty,
									meta: {
										...pricingMeta,
										baseUnitPrice,
										pricingAuthority: "recovered-relational-price",
										migrationVersion: MIGRATION_VERSION,
									},
								},
							});
							await tx.dykeSalesDoors.updateMany({
								where: {
									id: {
										in: rows
											.filter((row) => row.id !== stable.id)
											.map((row) => row.id),
									},
								},
								data: { deletedAt: new Date(), activeIdentity: null },
							});
							for (
								let index = retainedRows.length - 1;
								index >= 0;
								index -= 1
							) {
								if (
									rows.some((row) => row.id === retainedRows[index]?.id) &&
									retainedRows[index]?.id !== stable.id
								) {
									retainedRows.splice(index, 1);
								}
							}
							const stableIndex = retainedRows.findIndex(
								(row) => row.id === stable.id,
							);
							retainedRows[stableIndex] = {
								...pricing,
								id: stable.id,
								totalQty: retainedQty,
								lineTotal: retainedLineTotal,
							};
						}
						const hptTotal = sumMoney(
							retainedRows.map((door) => Number(door.lineTotal || 0)),
						);
						const hptQty = retainedRows.reduce(
							(sum, door) => sum + Number(door.totalQty || 0),
							0,
						);
						await tx.housePackageTools.update({
							where: { id: hpt.id },
							data: { totalDoors: hptQty, totalPrice: hptTotal },
						});
						await tx.salesOrderItems.update({
							where: { id: item.id },
							data: {
								qty: hptQty,
								rate: hptQty ? roundMoney(hptTotal / hptQty) : 0,
								total: hptTotal,
							},
						});
						itemTotals.set(item.id, hptTotal);
					}

					const summary = calculateSalesFormSummary({
						strategy: "legacy",
						taxRate: Number(
							order.taxPercentage ?? order.taxes[0]?.taxConfig?.percentage ?? 0,
						),
						lineItems: order.items.map((item) => {
							const itemMeta = record(item.meta);
							const nestedMeta = record(itemMeta.meta);
							return {
								qty: 1,
								unitPrice: itemTotals.get(item.id) || 0,
								lineTotal: itemTotals.get(item.id) || 0,
								taxxable: Boolean(itemMeta.tax ?? nestedMeta.taxxable ?? true),
								meta: nestedMeta,
							};
						}),
						extraCosts: order.extraCosts.map((cost) => ({
							type: cost.type,
							amount: Number(cost.amount || 0),
							taxxable: Boolean(cost.taxxable),
						})),
					});
					const paid = sumMoney(
						order.payments.map((payment) => Number(payment.amount || 0)),
					);
					const meta = record(order.meta);
					const oldForm = record(meta.newSalesForm);
					const {
						lineItems: _lines,
						extraCosts: _costs,
						summary: _summary,
						...uiMeta
					} = oldForm;
					const version = `${Date.now()}-${MIGRATION_VERSION}`;
					const updatedOrder = await tx.salesOrders.updateMany({
						where: { id: order.id, updatedAt: candidate.updatedAt },
						data: {
							subTotal: summary.subTotal,
							tax: summary.taxTotal,
							grandTotal: summary.grandTotal,
							amountDue: Math.max(0, roundMoney(summary.grandTotal - paid)),
							meta: {
								...meta,
								newSalesForm: {
									...uiMeta,
									version,
									updatedAt: new Date().toISOString(),
								},
							},
						},
					});
					if (updatedOrder.count !== 1) {
						throw new Error(
							`repair-conflict ${candidate.orderId}: concurrent document update detected`,
						);
					}
					await tx.salesTaxes.updateMany({
						where: { salesId: order.id, deletedAt: null },
						data: {
							taxxable: summary.taxableSubTotal,
							tax: summary.taxTotal,
						},
					});
					await tx.salesHistory.create({
						data: {
							salesId: order.id,
							name: "Sales form relational duplicate and pricing repair",
							authorName: "System migration",
							data: {
								event: "sales_form_relational_repair",
								migrationVersion: MIGRATION_VERSION,
								before,
								after: {
									subTotal: summary.subTotal,
									tax: summary.taxTotal,
									grandTotal: summary.grandTotal,
								},
								reason:
									"duplicate active door identity and missing base price authority",
							},
						},
					});
				},
				{ isolationLevel: "Serializable", maxWait: 5_000, timeout: 30_000 },
			);
			console.log(`repaired ${candidate.orderId}`);
		}
	} finally {
		await db.$disconnect();
	}
}

void main();
