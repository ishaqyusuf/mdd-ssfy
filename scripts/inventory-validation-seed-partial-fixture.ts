#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost/gnd-prisma2";
const SEED_FIXTURE_ID = "INV-FIX-PARTIAL";

type CliOptions = {
	apply: boolean;
	json: boolean;
	rollback: boolean;
};

type SeedStep = {
	action: "create" | "update" | "unchanged" | "soft-delete" | "cancel" | "missing";
	model:
		| "InventoryCategory"
		| "Inventory"
		| "InventoryVariant"
		| "InventoryStock"
		| "SubComponents"
		| "SalesOrders"
		| "SalesOrderItems"
		| "LineItem"
		| "LineItemComponents"
		| "StockAllocation";
	uid?: string;
	id?: number;
	changes: Record<string, unknown>;
};

type SeedResult = {
	seedFixtureId: typeof SEED_FIXTURE_ID;
	steps: SeedStep[];
};

class UsageError extends Error {}

const FIXTURE = {
	categoryUid: "inv-fix-partial-category",
	categoryTitle: "Inventory Validation Partial",
	itemUid: "inv-fix-partial-item",
	itemName: "Inventory Validation Partial Item",
	variantUid: "inv-fix-partial-variant",
	variantSku: "INV-FIX-PARTIAL",
	stockLocation: "validation-fixture",
	saleOrderId: "INV-FIX-PARTIAL",
	saleSlug: "inv-fix-partial",
};

const LINES = [
	{
		uid: "inv-fix-partial-available-line",
		title: "Inventory Validation Ship Available Partial Line",
		allocationStatus: "approved" as const,
		holdUntilComplete: false,
	},
	{
		uid: "inv-fix-partial-held-line",
		title: "Inventory Validation Held Partial Line",
		allocationStatus: "reserved" as const,
		holdUntilComplete: true,
	},
];

function usage() {
	console.log(
		[
			"Usage:",
			"  bun scripts/inventory-validation-seed-partial-fixture.ts",
			"  bun scripts/inventory-validation-seed-partial-fixture.ts --json",
			"  bun scripts/inventory-validation-seed-partial-fixture.ts --apply",
			"  bun scripts/inventory-validation-seed-partial-fixture.ts --rollback",
			"  bun scripts/inventory-validation-seed-partial-fixture.ts --rollback --apply",
			"",
			"Options:",
			"  --apply     Write or repair the partial shipment validation fixture",
			"  --json      Print the dry-run/apply result as JSON",
			"  --rollback  Soft-delete/cancel the partial shipment validation fixture instead of preparing it",
			"",
			"Default mode is dry-run. This script only prepares INV-FIX-PARTIAL.",
		].join("\n"),
	);
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		apply: false,
		json: false,
		rollback: false,
	};

	for (const arg of argv) {
		if (arg == "--help" || arg == "-h") {
			usage();
			process.exit(0);
		}
		if (arg == "--apply") {
			options.apply = true;
			continue;
		}
		if (arg == "--json") {
			options.json = true;
			continue;
		}
		if (arg == "--rollback") {
			options.rollback = true;
			continue;
		}
		throw new UsageError(`Unknown argument: ${arg}`);
	}

	return options;
}

function redactDatabaseUrl(value: string | undefined) {
	if (!value) return "<unset>";
	try {
		const url = new URL(value);
		url.username = url.username ? "redacted" : "";
		url.password = url.password ? "redacted" : "";
		return url.toString();
	} catch {
		return "<redacted>";
	}
}

function fieldValuesEqual(left: unknown, right: unknown) {
	if (left === right) return true;
	if (
		left &&
		right &&
		typeof left === "object" &&
		typeof right === "object"
	) {
		return JSON.stringify(left) === JSON.stringify(right);
	}
	return false;
}

function diffFields<T extends Record<string, unknown>>(
	current: T | null,
	desired: T,
) {
	if (!current) return desired;

	const changes: Record<string, unknown> = {};
	for (const [key, desiredValue] of Object.entries(desired)) {
		if (!fieldValuesEqual(current[key], desiredValue)) {
			changes[key] = desiredValue;
		}
	}
	return changes;
}

function plannedRef(value: number, label: string) {
	return value > 0 ? value : `<planned ${label}>`;
}

function pushStep(
	steps: SeedStep[],
	model: SeedStep["model"],
	existing: { id: number } | null,
	changes: Record<string, unknown>,
	uid?: string,
) {
	const step: SeedStep = {
		action: existing
			? Object.keys(changes).length
				? "update"
				: "unchanged"
			: "create",
		model,
		uid,
		id: existing?.id,
		changes,
	};
	steps.push(step);
	return step;
}

async function assertDatabaseReachable(
	db: typeof import("../packages/db/src/index.ts").db,
	databaseUrl: string,
) {
	try {
		await db.$queryRawUnsafe("SELECT 1");
	} catch {
		throw new Error(
			`Cannot reach the configured database (${databaseUrl}). Start the local DB or pass DATABASE_URL for the target environment, then rerun this fixture seed dry-run.`,
		);
	}
}

async function prepareFixture(
	db: typeof import("../packages/db/src/index.ts").db,
	apply: boolean,
): Promise<SeedResult> {
	const steps: SeedStep[] = [];

	const existingCategory = await db.inventoryCategory.findFirst({
		where: { uid: FIXTURE.categoryUid },
		select: {
			id: true,
			title: true,
			uid: true,
			productKind: true,
			stockMode: true,
			description: true,
			meta: true,
		},
	});
	const desiredCategory = {
		title: FIXTURE.categoryTitle,
		uid: FIXTURE.categoryUid,
		productKind: "inventory",
		stockMode: "monitored",
		description: `${SEED_FIXTURE_ID} validation fixture category`,
		meta: {
			validationFixture: true,
			seedFixtureId: SEED_FIXTURE_ID,
		},
	};
	const categoryChanges = diffFields(existingCategory, desiredCategory);
	const categoryStep = pushStep(
		steps,
		"InventoryCategory",
		existingCategory,
		categoryChanges,
		FIXTURE.categoryUid,
	);
	const category =
		apply && categoryStep.action == "create"
			? await db.inventoryCategory.create({
					data: desiredCategory,
					select: { id: true },
				})
			: apply && categoryStep.action == "update" && existingCategory
				? await db.inventoryCategory.update({
						where: { id: existingCategory.id },
						data: categoryChanges,
						select: { id: true },
					})
				: existingCategory;
	const categoryId = category?.id ?? existingCategory?.id ?? -1;

	const existingItem = await db.inventory.findFirst({
		where: { uid: FIXTURE.itemUid },
		select: {
			id: true,
			name: true,
			uid: true,
			productKind: true,
			sourceCustom: true,
			stockMode: true,
			status: true,
			description: true,
			inventoryCategoryId: true,
		},
	});
	const desiredItemData = {
		name: FIXTURE.itemName,
		uid: FIXTURE.itemUid,
		productKind: "inventory",
		sourceCustom: false,
		stockMode: "monitored",
		status: "published",
		description: `${SEED_FIXTURE_ID} validation fixture item`,
		inventoryCategoryId: categoryId,
	};
	const itemChanges = diffFields(existingItem, {
		...desiredItemData,
		inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
	});
	const itemStep = pushStep(
		steps,
		"Inventory",
		existingItem,
		itemChanges,
		FIXTURE.itemUid,
	);
	const item =
		apply && itemStep.action == "create"
			? await db.inventory.create({
					data: desiredItemData,
					select: { id: true },
				})
			: apply && itemStep.action == "update" && existingItem
				? await db.inventory.update({
						where: { id: existingItem.id },
						data: itemChanges,
						select: { id: true },
					})
				: existingItem;
	const itemId = item?.id ?? existingItem?.id ?? -1;

	const existingVariant = await db.inventoryVariant.findFirst({
		where: { uid: FIXTURE.variantUid },
		select: {
			id: true,
			uid: true,
			sku: true,
			status: true,
			lowStockAlert: true,
			description: true,
			inventoryId: true,
		},
	});
	const desiredVariantData = {
		uid: FIXTURE.variantUid,
		sku: FIXTURE.variantSku,
		status: "published",
		lowStockAlert: null,
		description: `${SEED_FIXTURE_ID} validation fixture variant`,
		inventoryId: itemId,
	};
	const variantChanges = diffFields(existingVariant, {
		...desiredVariantData,
		inventoryId: plannedRef(itemId, FIXTURE.itemUid),
	});
	const variantStep = pushStep(
		steps,
		"InventoryVariant",
		existingVariant,
		variantChanges,
		FIXTURE.variantUid,
	);
	const variant =
		apply && variantStep.action == "create"
			? await db.inventoryVariant.create({
					data: desiredVariantData,
					select: { id: true },
				})
			: apply && variantStep.action == "update" && existingVariant
				? await db.inventoryVariant.update({
						where: { id: existingVariant.id },
						data: variantChanges,
						select: { id: true },
					})
				: existingVariant;
	const variantId = variant?.id ?? existingVariant?.id ?? -1;

	const existingStock =
		variantId > 0
			? await db.inventoryStock.findFirst({
					where: {
						inventoryVariantId: variantId,
						location: FIXTURE.stockLocation,
					},
					select: {
						id: true,
						inventoryVariantId: true,
						location: true,
						qty: true,
						price: true,
					},
				})
			: null;
	const desiredStockData = {
		inventoryVariantId: variantId,
		location: FIXTURE.stockLocation,
		qty: 4,
		price: 0,
	};
	const stockChanges = diffFields(existingStock, {
		...desiredStockData,
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
	});
	const stockStep = pushStep(steps, "InventoryStock", existingStock, stockChanges);
	const stock =
		apply && stockStep.action == "create"
			? await db.inventoryStock.create({
					data: desiredStockData,
					select: { id: true },
				})
			: apply && stockStep.action == "update" && existingStock
				? await db.inventoryStock.update({
						where: { id: existingStock.id },
						data: stockChanges,
						select: { id: true },
					})
				: existingStock;
	const stockId = stock?.id ?? existingStock?.id ?? -1;

	const existingSubComponent =
		itemId > 0 && categoryId > 0
			? await db.subComponents.findFirst({
					where: {
						parentId: itemId,
						inventoryCategoryId: categoryId,
					},
					select: {
						id: true,
						required: true,
						index: true,
						status: true,
						inventoryCategoryId: true,
						defaultInventoryId: true,
						parentId: true,
					},
				})
			: null;
	const desiredSubComponentData = {
		required: true,
		index: 0,
		status: "published",
		inventoryCategoryId: categoryId,
		defaultInventoryId: itemId,
		parentId: itemId,
	};
	const subComponentChanges = diffFields(existingSubComponent, {
		...desiredSubComponentData,
		inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
		defaultInventoryId: plannedRef(itemId, FIXTURE.itemUid),
		parentId: plannedRef(itemId, FIXTURE.itemUid),
	});
	const subComponentStep = pushStep(
		steps,
		"SubComponents",
		existingSubComponent,
		subComponentChanges,
	);
	const subComponent =
		apply && subComponentStep.action == "create"
			? await db.subComponents.create({
					data: desiredSubComponentData,
					select: { id: true },
				})
			: apply && subComponentStep.action == "update" && existingSubComponent
				? await db.subComponents.update({
						where: { id: existingSubComponent.id },
						data: subComponentChanges,
						select: { id: true },
					})
				: existingSubComponent;
	const subComponentId = subComponent?.id ?? existingSubComponent?.id ?? -1;

	const existingSale = await db.salesOrders.findFirst({
		where: {
			orderId: FIXTURE.saleOrderId,
			type: "order",
		},
		select: {
			id: true,
			title: true,
			orderId: true,
			slug: true,
			type: true,
			status: true,
			inventoryStatus: true,
			isDyke: true,
			meta: true,
		},
	});
	const desiredSaleData = {
		title: "Inventory Validation Partial Shipment Order",
		orderId: FIXTURE.saleOrderId,
		slug: FIXTURE.saleSlug,
		type: "order",
		status: "Active",
		inventoryStatus: "AVAILABLE",
		isDyke: false,
		meta: {
			validationFixture: true,
			seedFixtureId: SEED_FIXTURE_ID,
		},
	};
	const saleChanges = diffFields(existingSale, desiredSaleData);
	const saleStep = pushStep(
		steps,
		"SalesOrders",
		existingSale,
		saleChanges,
		FIXTURE.saleOrderId,
	);
	const sale =
		apply && saleStep.action == "create"
			? await db.salesOrders.create({
					data: desiredSaleData,
					select: { id: true },
				})
			: apply && saleStep.action == "update" && existingSale
				? await db.salesOrders.update({
						where: { id: existingSale.id },
						data: saleChanges,
						select: { id: true },
					})
				: existingSale;
	const saleId = sale?.id ?? existingSale?.id ?? -1;

	for (const line of LINES) {
		const existingSalesItem = await db.salesOrderItems.findFirst({
			where: {
				salesOrderId: saleId > 0 ? saleId : undefined,
				meta: {
					path: "$.lineUid",
					equals: line.uid,
				},
			},
			select: {
				id: true,
				description: true,
				qty: true,
				salesOrderId: true,
				dykeProduction: true,
				meta: true,
			},
		});
		const desiredSalesItemData = {
			description: line.title,
			qty: 2,
			salesOrderId: saleId,
			dykeProduction: true,
			meta: {
				validationFixture: true,
				seedFixtureId: SEED_FIXTURE_ID,
				lineUid: line.uid,
			},
		};
		const salesItemChanges = diffFields(existingSalesItem, {
			...desiredSalesItemData,
			salesOrderId: plannedRef(saleId, FIXTURE.saleOrderId),
		});
		const salesItemStep = pushStep(
			steps,
			"SalesOrderItems",
			existingSalesItem,
			salesItemChanges,
			`${line.uid}-sales-item`,
		);
		const salesItem =
			apply && salesItemStep.action == "create"
				? await db.salesOrderItems.create({
						data: desiredSalesItemData,
						select: { id: true },
					})
				: apply && salesItemStep.action == "update" && existingSalesItem
					? await db.salesOrderItems.update({
							where: { id: existingSalesItem.id },
							data: salesItemChanges,
							select: { id: true },
						})
					: existingSalesItem;
		const salesItemId = salesItem?.id ?? existingSalesItem?.id ?? -1;

		const existingLineItem = await db.lineItem.findFirst({
			where: { uid: line.uid },
			select: {
				id: true,
				uid: true,
				title: true,
				description: true,
				qty: true,
				lineItemType: true,
				inventoryVariantId: true,
				inventoryId: true,
				inventoryCategoryId: true,
				saleId: true,
				salesItemId: true,
				meta: true,
			},
		});
		const desiredLineItemData = {
			uid: line.uid,
			title: line.title,
			description: `${SEED_FIXTURE_ID} validation fixture line`,
			qty: 2,
			lineItemType: "SALE" as const,
			inventoryVariantId: variantId,
			inventoryId: itemId,
			inventoryCategoryId: categoryId,
			saleId,
			salesItemId,
			meta: {
				validationFixture: true,
				seedFixtureId: SEED_FIXTURE_ID,
				fulfillment: {
					holdUntilComplete: line.holdUntilComplete,
				},
			},
		};
		const lineItemChanges = diffFields(existingLineItem, {
			...desiredLineItemData,
			inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
			inventoryId: plannedRef(itemId, FIXTURE.itemUid),
			inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
			saleId: plannedRef(saleId, FIXTURE.saleOrderId),
			salesItemId: plannedRef(salesItemId, `${line.uid}-sales-item`),
		});
		const lineItemStep = pushStep(
			steps,
			"LineItem",
			existingLineItem,
			lineItemChanges,
			line.uid,
		);
		const lineItem =
			apply && lineItemStep.action == "create"
				? await db.lineItem.create({
						data: desiredLineItemData,
						select: { id: true },
					})
				: apply && lineItemStep.action == "update" && existingLineItem
					? await db.lineItem.update({
							where: { id: existingLineItem.id },
							data: lineItemChanges,
							select: { id: true },
						})
					: existingLineItem;
		const lineItemId = lineItem?.id ?? existingLineItem?.id ?? -1;

		const existingLineComponent =
			lineItemId > 0 && subComponentId > 0
				? await db.lineItemComponents.findFirst({
						where: {
							lineItemId,
							subComponentId,
						},
						select: {
							id: true,
							required: true,
							lineItemId: true,
							inventoryCategoryId: true,
							subComponentId: true,
							inventoryId: true,
							inventoryVariantId: true,
							qty: true,
							qtyAllocated: true,
							qtyInbound: true,
							qtyReceived: true,
							status: true,
						},
					})
				: null;
		const desiredLineComponentData = {
			required: true,
			lineItemId,
			inventoryCategoryId: categoryId,
			subComponentId,
			inventoryId: itemId,
			inventoryVariantId: variantId,
			qty: 2,
			qtyAllocated: 1,
			qtyInbound: 0,
			qtyReceived: 0,
			status: "partially_allocated" as const,
		};
		const lineComponentChanges = diffFields(existingLineComponent, {
			...desiredLineComponentData,
			lineItemId: plannedRef(lineItemId, line.uid),
			inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
			subComponentId: plannedRef(subComponentId, "subcomponent"),
			inventoryId: plannedRef(itemId, FIXTURE.itemUid),
			inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
		});
		const lineComponentStep = pushStep(
			steps,
			"LineItemComponents",
			existingLineComponent,
			lineComponentChanges,
		);
		const lineComponent =
			apply && lineComponentStep.action == "create"
				? await db.lineItemComponents.create({
						data: desiredLineComponentData,
						select: { id: true },
					})
				: apply && lineComponentStep.action == "update" && existingLineComponent
					? await db.lineItemComponents.update({
							where: { id: existingLineComponent.id },
							data: lineComponentChanges,
							select: { id: true },
						})
					: existingLineComponent;
		const lineComponentId = lineComponent?.id ?? existingLineComponent?.id ?? -1;

		const existingAllocation =
			lineComponentId > 0 && variantId > 0
				? await db.stockAllocation.findFirst({
						where: {
							lineItemComponentId: lineComponentId,
							inventoryVariantId: variantId,
							status: line.allocationStatus,
						},
						select: {
							id: true,
							lineItemComponentId: true,
							inventoryStockId: true,
							inventoryVariantId: true,
							qty: true,
							status: true,
							notes: true,
						},
					})
				: null;
		const desiredAllocationData = {
			lineItemComponentId: lineComponentId,
			inventoryStockId: stockId > 0 ? stockId : null,
			inventoryVariantId: variantId,
			qty: 1,
			status: line.allocationStatus,
			notes: `${SEED_FIXTURE_ID} ${line.uid} validation fixture allocation`,
		};
		const allocationChanges = diffFields(existingAllocation, {
			...desiredAllocationData,
			lineItemComponentId: plannedRef(lineComponentId, "line component"),
			inventoryStockId: stockId > 0 ? stockId : "<planned stock>",
			inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
		});
		const allocationStep = pushStep(
			steps,
			"StockAllocation",
			existingAllocation,
			allocationChanges,
			line.uid,
		);
		if (apply && allocationStep.action == "create") {
			await db.stockAllocation.create({
				data: desiredAllocationData,
				select: { id: true },
			});
		} else if (apply && allocationStep.action == "update" && existingAllocation) {
			await db.stockAllocation.update({
				where: { id: existingAllocation.id },
				data: allocationChanges,
				select: { id: true },
			});
		}
	}

	return {
		seedFixtureId: SEED_FIXTURE_ID,
		steps,
	};
}

async function rollbackFixture(
	db: typeof import("../packages/db/src/index.ts").db,
	apply: boolean,
): Promise<SeedResult> {
	const deletedAt = new Date();
	const steps: SeedStep[] = [];
	const lineItems = await db.lineItem.findMany({
		where: {
			uid: {
				in: LINES.map((line) => line.uid),
			},
			deletedAt: null,
		},
		select: { id: true, uid: true },
	});
	const lineItemIds = lineItems.map((line) => line.id);
	const lineComponents = lineItemIds.length
		? await db.lineItemComponents.findMany({
				where: {
					lineItemId: {
						in: lineItemIds,
					},
				},
				select: { id: true },
			})
		: [];
	const lineComponentIds = lineComponents.map((component) => component.id);
	const allocations = lineComponentIds.length
		? await db.stockAllocation.findMany({
				where: {
					lineItemComponentId: {
						in: lineComponentIds,
					},
					deletedAt: null,
				},
				select: { id: true, status: true },
			})
		: [];
	for (const allocation of allocations) {
		steps.push({
			action: "soft-delete",
			model: "StockAllocation",
			uid: allocation.status,
			id: allocation.id,
			changes: { deletedAt: deletedAt.toISOString() },
		});
	}
	if (apply && allocations.length) {
		await db.stockAllocation.updateMany({
			where: {
				id: {
					in: allocations.map((allocation) => allocation.id),
				},
			},
			data: { deletedAt },
		});
	}
	if (!allocations.length) {
		steps.push({ action: "missing", model: "StockAllocation", changes: {} });
	}

	for (const component of lineComponents) {
		steps.push({
			action: "cancel",
			model: "LineItemComponents",
			id: component.id,
			changes: { status: "cancelled", qtyAllocated: 0 },
		});
	}
	if (apply && lineComponentIds.length) {
		await db.lineItemComponents.updateMany({
			where: {
				id: {
					in: lineComponentIds,
				},
			},
			data: { status: "cancelled", qtyAllocated: 0 },
		});
	}
	if (!lineComponents.length) {
		steps.push({ action: "missing", model: "LineItemComponents", changes: {} });
	}

	for (const lineItem of lineItems) {
		steps.push({
			action: "soft-delete",
			model: "LineItem",
			uid: lineItem.uid ?? undefined,
			id: lineItem.id,
			changes: { deletedAt: deletedAt.toISOString() },
		});
	}
	if (apply && lineItemIds.length) {
		await db.lineItem.updateMany({
			where: {
				id: {
					in: lineItemIds,
				},
			},
			data: { deletedAt },
		});
	}
	if (!lineItems.length) {
		steps.push({ action: "missing", model: "LineItem", changes: {} });
	}

	const sale = await db.salesOrders.findFirst({
		where: { orderId: FIXTURE.saleOrderId, type: "order", deletedAt: null },
		select: { id: true },
	});
	const salesItems = sale
		? await db.salesOrderItems.findMany({
				where: {
					salesOrderId: sale.id,
					meta: {
						path: "$.seedFixtureId",
						equals: SEED_FIXTURE_ID,
					},
					deletedAt: null,
				},
				select: { id: true },
			})
		: [];
	for (const salesItem of salesItems) {
		steps.push({
			action: "soft-delete",
			model: "SalesOrderItems",
			id: salesItem.id,
			changes: { deletedAt: deletedAt.toISOString() },
		});
	}
	if (apply && salesItems.length) {
		await db.salesOrderItems.updateMany({
			where: {
				id: {
					in: salesItems.map((salesItem) => salesItem.id),
				},
			},
			data: { deletedAt },
		});
	}
	if (!salesItems.length) {
		steps.push({ action: "missing", model: "SalesOrderItems", changes: {} });
	}

	const subComponent = await db.subComponents.findFirst({
		where: { parent: { uid: FIXTURE.itemUid }, deletedAt: null },
		select: { id: true },
	});
	const subComponentStep: SeedStep = {
		action: subComponent ? "soft-delete" : "missing",
		model: "SubComponents",
		id: subComponent?.id,
		changes: subComponent ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(subComponentStep);
	if (apply && subComponent) {
		await db.subComponents.update({
			where: { id: subComponent.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const variant = await db.inventoryVariant.findFirst({
		where: { uid: FIXTURE.variantUid, deletedAt: null },
		select: { id: true },
	});
	const stock = variant
		? await db.inventoryStock.findFirst({
				where: {
					inventoryVariantId: variant.id,
					location: FIXTURE.stockLocation,
					deletedAt: null,
				},
				select: { id: true },
			})
		: null;
	const stockStep: SeedStep = {
		action: stock ? "soft-delete" : "missing",
		model: "InventoryStock",
		id: stock?.id,
		changes: stock ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(stockStep);
	if (apply && stock) {
		await db.inventoryStock.update({
			where: { id: stock.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const variantStep: SeedStep = {
		action: variant ? "soft-delete" : "missing",
		model: "InventoryVariant",
		uid: FIXTURE.variantUid,
		id: variant?.id,
		changes: variant ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(variantStep);
	if (apply && variant) {
		await db.inventoryVariant.update({
			where: { id: variant.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const saleForDeletion = await db.salesOrders.findFirst({
		where: { orderId: FIXTURE.saleOrderId, type: "order", deletedAt: null },
		select: { id: true },
	});
	const saleStep: SeedStep = {
		action: saleForDeletion ? "soft-delete" : "missing",
		model: "SalesOrders",
		uid: FIXTURE.saleOrderId,
		id: saleForDeletion?.id,
		changes: saleForDeletion ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(saleStep);
	if (apply && saleForDeletion) {
		await db.salesOrders.update({
			where: { id: saleForDeletion.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const item = await db.inventory.findFirst({
		where: { uid: FIXTURE.itemUid, deletedAt: null },
		select: { id: true },
	});
	const itemStep: SeedStep = {
		action: item ? "soft-delete" : "missing",
		model: "Inventory",
		uid: FIXTURE.itemUid,
		id: item?.id,
		changes: item ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(itemStep);
	if (apply && item) {
		await db.inventory.update({
			where: { id: item.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const category = await db.inventoryCategory.findFirst({
		where: { uid: FIXTURE.categoryUid, deletedAt: null },
		select: { id: true },
	});
	const categoryStep: SeedStep = {
		action: category ? "soft-delete" : "missing",
		model: "InventoryCategory",
		uid: FIXTURE.categoryUid,
		id: category?.id,
		changes: category ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(categoryStep);
	if (apply && category) {
		await db.inventoryCategory.update({
			where: { id: category.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	return {
		seedFixtureId: SEED_FIXTURE_ID,
		steps,
	};
}

function printHumanResult(payload: {
	mode: "dry-run" | "apply" | "rollback-dry-run" | "rollback-apply";
	generatedAt: string;
	databaseUrl: string;
	result: SeedResult;
}) {
	console.log("Inventory validation partial shipment fixture seed");
	console.log(`mode: ${payload.mode}`);
	console.log(`generatedAt: ${payload.generatedAt}`);
	console.log(`database: ${payload.databaseUrl}`);
	console.log("");
	console.log(payload.result.seedFixtureId);
	for (const step of payload.result.steps) {
		const target = step.uid ? `${step.model}(${step.uid})` : step.model;
		console.log(`  - ${step.action}: ${target}${step.id ? ` id=${step.id}` : ""}`);
		if (Object.keys(step.changes).length) {
			console.log(`    changes: ${JSON.stringify(step.changes)}`);
		}
	}
	console.log("");

	if (payload.mode == "dry-run") {
		console.log("No data was written. Re-run with --apply to create or repair INV-FIX-PARTIAL.");
	} else if (payload.mode == "rollback-dry-run") {
		console.log(
			"No data was written. Re-run with --rollback --apply to soft-delete/cancel INV-FIX-PARTIAL rows.",
		);
	}
	console.log("After applying or rolling back, run `bun run inventory:validation-fixtures --markdown`.");
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;

	const { db } = await import("../packages/db/src/index.ts");
	const databaseUrl = redactDatabaseUrl(process.env.DATABASE_URL);

	try {
		await assertDatabaseReachable(db, databaseUrl);
		const result = options.rollback
			? await rollbackFixture(db, options.apply)
			: await prepareFixture(db, options.apply);
		const payload = {
			mode: options.rollback
				? options.apply
					? "rollback-apply"
					: "rollback-dry-run"
				: options.apply
					? "apply"
					: "dry-run",
			generatedAt: new Date().toISOString(),
			databaseUrl,
			result,
		} as const;

		if (options.json) {
			console.log(JSON.stringify(payload, null, 2));
		} else {
			printHumanResult(payload);
		}
	} finally {
		await db.$disconnect();
	}
}

main().catch((error) => {
	console.error(
		`[inventory-validation-seed-partial-fixture] ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	if (error instanceof UsageError) usage();
	process.exit(1);
});
