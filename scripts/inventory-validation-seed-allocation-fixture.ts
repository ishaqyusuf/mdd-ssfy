#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost/gnd-prisma2";
const SEED_FIXTURE_ID = "INV-FIX-ALLOC";
const ALLOCATION_PROOFS = [
	{
		key: "pending_review_approve",
		status: "pending_review",
		purpose: "approve workflow",
	},
	{
		key: "pending_review_reject",
		status: "pending_review",
		purpose: "reject workflow",
	},
	{
		key: "pending_review_bulk",
		status: "pending_review",
		purpose: "bulk approve workflow",
	},
	{
		key: "dispatch_assign",
		status: "approved",
		purpose: "dispatch assign workflow",
	},
	{
		key: "dispatch_assign_spare",
		status: "approved",
		purpose: "dispatch assign spare capacity",
	},
	{
		key: "dispatch_pack",
		status: "reserved",
		purpose: "dispatch pack workflow",
	},
	{
		key: "dispatch_release",
		status: "reserved",
		purpose: "dispatch release workflow",
	},
	{
		key: "dispatch_fulfill",
		status: "picked",
		purpose: "dispatch fulfill workflow",
	},
] as const;
const ALLOCATION_STATUSES = [
	"pending_review",
	"approved",
	"reserved",
	"picked",
] as const;

type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

type CliOptions = {
	apply: boolean;
	json: boolean;
	rollback: boolean;
};

type SeedStep = {
	action:
		| "create"
		| "update"
		| "unchanged"
		| "soft-delete"
		| "cancel"
		| "missing";
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
	categoryUid: "inv-fix-alloc-category",
	categoryTitle: "Inventory Validation Allocation",
	itemUid: "inv-fix-alloc-item",
	itemName: "Inventory Validation Allocation Item",
	variantUid: "inv-fix-alloc-variant",
	variantSku: "INV-FIX-ALLOC",
	stockLocation: "validation-fixture",
	stockQty: 20,
	saleOrderId: "INV-FIX-ALLOC",
	saleSlug: "inv-fix-alloc",
	lineUid: "inv-fix-alloc-line",
	lineTitle: "Inventory Validation Allocation Line",
};

function usage() {
	console.log(
		[
			"Usage:",
			"  bun scripts/inventory-validation-seed-allocation-fixture.ts",
			"  bun scripts/inventory-validation-seed-allocation-fixture.ts --json",
			"  bun scripts/inventory-validation-seed-allocation-fixture.ts --apply",
			"  bun scripts/inventory-validation-seed-allocation-fixture.ts --rollback",
			"  bun scripts/inventory-validation-seed-allocation-fixture.ts --rollback --apply",
			"",
			"Options:",
			"  --apply     Write or repair the allocation validation fixture",
			"  --json      Print the dry-run/apply result as JSON",
			"  --rollback  Soft-delete/cancel the allocation validation fixture instead of preparing it",
			"",
			"Default mode is dry-run. This script only prepares INV-FIX-ALLOC.",
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
	const categoryStep: SeedStep = {
		action: existingCategory
			? Object.keys(categoryChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "InventoryCategory",
		uid: FIXTURE.categoryUid,
		id: existingCategory?.id,
		changes: categoryChanges,
	};
	steps.push(categoryStep);
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
	const itemStep: SeedStep = {
		action: existingItem
			? Object.keys(itemChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "Inventory",
		uid: FIXTURE.itemUid,
		id: existingItem?.id,
		changes: itemChanges,
	};
	steps.push(itemStep);
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
	const variantStep: SeedStep = {
		action: existingVariant
			? Object.keys(variantChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "InventoryVariant",
		uid: FIXTURE.variantUid,
		id: existingVariant?.id,
		changes: variantChanges,
	};
	steps.push(variantStep);
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

	const existingStock = await db.inventoryStock.findFirst({
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
	});
	const desiredStockData = {
		inventoryVariantId: variantId,
		location: FIXTURE.stockLocation,
		qty: FIXTURE.stockQty,
		price: 0,
	};
	const stockChanges = diffFields(existingStock, {
		...desiredStockData,
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
	});
	const stockStep: SeedStep = {
		action: existingStock
			? Object.keys(stockChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "InventoryStock",
		id: existingStock?.id,
		changes: stockChanges,
	};
	steps.push(stockStep);
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
	const subComponentStep: SeedStep = {
		action: existingSubComponent
			? Object.keys(subComponentChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "SubComponents",
		id: existingSubComponent?.id,
		changes: subComponentChanges,
	};
	steps.push(subComponentStep);
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
		title: "Inventory Validation Allocation Order",
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
	const saleStep: SeedStep = {
		action: existingSale
			? Object.keys(saleChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "SalesOrders",
		uid: FIXTURE.saleOrderId,
		id: existingSale?.id,
		changes: saleChanges,
	};
	steps.push(saleStep);
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

	const existingSalesItem = await db.salesOrderItems.findFirst({
		where: {
			salesOrderId: saleId > 0 ? saleId : undefined,
			meta: {
				path: ["seedFixtureId"],
				equals: SEED_FIXTURE_ID,
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
		description: FIXTURE.lineTitle,
		qty: 3,
		salesOrderId: saleId,
		dykeProduction: true,
		meta: {
			validationFixture: true,
			seedFixtureId: SEED_FIXTURE_ID,
		},
	};
	const salesItemChanges = diffFields(existingSalesItem, {
		...desiredSalesItemData,
		salesOrderId: plannedRef(saleId, FIXTURE.saleOrderId),
	});
	const salesItemStep: SeedStep = {
		action: existingSalesItem
			? Object.keys(salesItemChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "SalesOrderItems",
		uid: `${FIXTURE.saleOrderId}-item`,
		id: existingSalesItem?.id,
		changes: salesItemChanges,
	};
	steps.push(salesItemStep);
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
		where: { uid: FIXTURE.lineUid },
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
		uid: FIXTURE.lineUid,
		title: FIXTURE.lineTitle,
		description: `${SEED_FIXTURE_ID} validation fixture line`,
		qty: 3,
		lineItemType: "SALE" as const,
		inventoryVariantId: variantId,
		inventoryId: itemId,
		inventoryCategoryId: categoryId,
		saleId,
		salesItemId,
		meta: {
			validationFixture: true,
			seedFixtureId: SEED_FIXTURE_ID,
			production: {
				produceable: true,
			},
		},
	};
	const lineItemChanges = diffFields(existingLineItem, {
		...desiredLineItemData,
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
		inventoryId: plannedRef(itemId, FIXTURE.itemUid),
		inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
		saleId: plannedRef(saleId, FIXTURE.saleOrderId),
		salesItemId: plannedRef(salesItemId, `${FIXTURE.saleOrderId}-item`),
	});
	const lineItemStep: SeedStep = {
		action: existingLineItem
			? Object.keys(lineItemChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "LineItem",
		uid: FIXTURE.lineUid,
		id: existingLineItem?.id,
		changes: lineItemChanges,
	};
	steps.push(lineItemStep);
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
		qty: 3,
		qtyAllocated: 3,
		qtyInbound: 0,
		qtyReceived: 0,
		status: "allocated" as const,
	};
	const lineComponentChanges = diffFields(existingLineComponent, {
		...desiredLineComponentData,
		lineItemId: plannedRef(lineItemId, FIXTURE.lineUid),
		inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
		subComponentId: plannedRef(subComponentId, "subcomponent"),
		inventoryId: plannedRef(itemId, FIXTURE.itemUid),
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
	});
	const lineComponentStep: SeedStep = {
		action: existingLineComponent
			? Object.keys(lineComponentChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "LineItemComponents",
		id: existingLineComponent?.id,
		changes: lineComponentChanges,
	};
	steps.push(lineComponentStep);
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

	for (const allocationProof of ALLOCATION_PROOFS) {
		const existingAllocation =
			lineComponentId > 0 && variantId > 0
				? await db.stockAllocation.findFirst({
						where: {
							lineItemComponentId: lineComponentId,
							inventoryVariantId: variantId,
							status: allocationProof.status,
							notes: `${SEED_FIXTURE_ID} ${allocationProof.key} validation fixture allocation`,
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
			status: allocationProof.status as AllocationStatus,
			notes: `${SEED_FIXTURE_ID} ${allocationProof.key} validation fixture allocation`,
		};
		const allocationChanges = diffFields(existingAllocation, {
			...desiredAllocationData,
			lineItemComponentId: plannedRef(lineComponentId, "line component"),
			inventoryStockId: stockId > 0 ? stockId : `<planned stock>`,
			inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
		});
		const allocationStep: SeedStep = {
			action: existingAllocation
			? Object.keys(allocationChanges).length
					? "update"
					: "unchanged"
				: "create",
			model: "StockAllocation",
			uid: allocationProof.key,
			id: existingAllocation?.id,
			changes: allocationChanges,
		};
		steps.push(allocationStep);
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

	const sale = await db.salesOrders.findFirst({
		where: {
			orderId: FIXTURE.saleOrderId,
			type: "order",
			deletedAt: null,
		},
		select: { id: true },
	});
	const lineItem = await db.lineItem.findFirst({
		where: {
			uid: FIXTURE.lineUid,
			deletedAt: null,
		},
		select: { id: true },
	});
	const lineComponent = lineItem
		? await db.lineItemComponents.findFirst({
				where: { lineItemId: lineItem.id },
				select: { id: true },
			})
		: null;
	const variant = await db.inventoryVariant.findFirst({
		where: {
			uid: FIXTURE.variantUid,
			deletedAt: null,
		},
		select: { id: true, uid: true },
	});

	const allocations = lineComponent
		? await db.stockAllocation.findMany({
				where: {
					lineItemComponentId: lineComponent.id,
					deletedAt: null,
					status: {
						in: [...ALLOCATION_STATUSES],
					},
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
		steps.push({
			action: "missing",
			model: "StockAllocation",
			changes: {},
		});
	}

	const lineComponentStep: SeedStep = {
		action: lineComponent ? "cancel" : "missing",
		model: "LineItemComponents",
		id: lineComponent?.id,
		changes: lineComponent ? { status: "cancelled", qtyAllocated: 0 } : {},
	};
	steps.push(lineComponentStep);
	if (apply && lineComponent) {
		await db.lineItemComponents.update({
			where: { id: lineComponent.id },
			data: {
				status: "cancelled",
				qtyAllocated: 0,
			},
			select: { id: true },
		});
	}

	const lineItemStep: SeedStep = {
		action: lineItem ? "soft-delete" : "missing",
		model: "LineItem",
		uid: FIXTURE.lineUid,
		id: lineItem?.id,
		changes: lineItem ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(lineItemStep);
	if (apply && lineItem) {
		await db.lineItem.update({
			where: { id: lineItem.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const subComponent = await db.subComponents.findFirst({
		where: {
			parent: {
				uid: FIXTURE.itemUid,
			},
			deletedAt: null,
		},
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

	const saleStep: SeedStep = {
		action: sale ? "soft-delete" : "missing",
		model: "SalesOrders",
		uid: FIXTURE.saleOrderId,
		id: sale?.id,
		changes: sale ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(saleStep);
	if (apply && sale) {
		await db.salesOrders.update({
			where: { id: sale.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const item = await db.inventory.findFirst({
		where: {
			uid: FIXTURE.itemUid,
			deletedAt: null,
		},
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
		where: {
			uid: FIXTURE.categoryUid,
			deletedAt: null,
		},
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
	console.log("Inventory validation allocation fixture seed");
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
		console.log("No data was written. Re-run with --apply to create or repair INV-FIX-ALLOC.");
	} else if (payload.mode == "rollback-dry-run") {
		console.log(
			"No data was written. Re-run with --rollback --apply to soft-delete/cancel INV-FIX-ALLOC rows.",
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
		`[inventory-validation-seed-allocation-fixture] ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	if (error instanceof UsageError) usage();
	process.exit(1);
});
