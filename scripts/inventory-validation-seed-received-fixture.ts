#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";
const SEED_FIXTURE_ID = "INV-FIX-RECEIVED";

type CliOptions = {
	apply: boolean;
	json: boolean;
	rollback: boolean;
};

type SeedStep = {
	action: "create" | "update" | "unchanged" | "soft-delete" | "cancel" | "missing";
	model:
		| "Supplier"
		| "InventoryCategory"
		| "Inventory"
		| "InventoryVariant"
		| "SubComponents"
		| "SalesOrders"
		| "LineItem"
		| "LineItemComponents"
		| "InventoryStock"
		| "InboundShipment"
		| "InboundShipmentItem"
		| "InboundDemand";
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
	supplierUid: "inv-fix-received-supplier",
	supplierName: "Inventory Validation Received Supplier",
	categoryUid: "inv-fix-received-category",
	categoryTitle: "Inventory Validation Received",
	itemUid: "inv-fix-received-item",
	itemName: "Inventory Validation Received Item",
	variantUid: "inv-fix-received-variant",
	variantSku: "INV-FIX-RECEIVED",
	saleOrderId: "INV-FIX-RECEIVED",
	saleSlug: "inv-fix-received",
	lineUid: "inv-fix-received-line",
	lineTitle: "Inventory Validation Received Backorder Line",
	shipmentReference: "INV-FIX-RECEIVED-SHIPMENT",
};

function usage() {
	console.log(
		[
			"Usage:",
			"  bun scripts/inventory-validation-seed-received-fixture.ts",
			"  bun scripts/inventory-validation-seed-received-fixture.ts --json",
			"  bun scripts/inventory-validation-seed-received-fixture.ts --apply",
			"  bun scripts/inventory-validation-seed-received-fixture.ts --rollback",
			"  bun scripts/inventory-validation-seed-received-fixture.ts --rollback --apply",
			"",
			"Options:",
			"  --apply     Write or repair the received-backorder validation fixture",
			"  --json      Print the dry-run/apply result as JSON",
			"  --rollback  Soft-delete/cancel the received-backorder validation fixture instead of preparing it",
			"",
			"Default mode is dry-run. This script only prepares INV-FIX-RECEIVED.",
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

async function upsertCoreFixtureRows(
	db: typeof import("../packages/db/src/index.ts").db,
	steps: SeedStep[],
	apply: boolean,
) {
	const existingSupplier = await db.supplier.findFirst({
		where: { uid: FIXTURE.supplierUid },
		select: { id: true, uid: true, name: true, address: true },
	});
	const supplierChanges = diffFields(existingSupplier, {
		uid: FIXTURE.supplierUid,
		name: FIXTURE.supplierName,
		address: `${SEED_FIXTURE_ID} validation fixture supplier`,
	});
	const supplierStep = pushStep(
		steps,
		"Supplier",
		existingSupplier,
		supplierChanges,
		FIXTURE.supplierUid,
	);
	const supplier =
		apply && supplierStep.action == "create"
			? await db.supplier.create({
					data: {
						uid: FIXTURE.supplierUid,
						name: FIXTURE.supplierName,
						address: `${SEED_FIXTURE_ID} validation fixture supplier`,
					},
					select: { id: true },
				})
			: apply && supplierStep.action == "update" && existingSupplier
				? await db.supplier.update({
						where: { id: existingSupplier.id },
						data: supplierChanges,
						select: { id: true },
					})
				: existingSupplier;
	const supplierId = supplier?.id ?? existingSupplier?.id ?? -1;

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
			defaultSupplierId: true,
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
		defaultSupplierId: supplierId,
	};
	const itemChanges = diffFields(existingItem, {
		...desiredItemData,
		inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
		defaultSupplierId: plannedRef(supplierId, FIXTURE.supplierUid),
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
						location: "validation-fixture",
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
		location: "validation-fixture",
		qty: 1,
		price: 0,
	};
	const stockChanges = diffFields(existingStock, {
		...desiredStockData,
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
	});
	const stockStep = pushStep(
		steps,
		"InventoryStock",
		existingStock,
		stockChanges,
	);
	if (apply && stockStep.action == "create") {
		await db.inventoryStock.create({
			data: desiredStockData,
			select: { id: true },
		});
	} else if (apply && stockStep.action == "update" && existingStock) {
		await db.inventoryStock.update({
			where: { id: existingStock.id },
			data: stockChanges,
			select: { id: true },
		});
	}

	return {
		supplierId,
		categoryId,
		itemId,
		variantId,
	};
}

async function prepareFixture(
	db: typeof import("../packages/db/src/index.ts").db,
	apply: boolean,
): Promise<SeedResult> {
	const steps: SeedStep[] = [];
	const { supplierId, categoryId, itemId, variantId } =
		await upsertCoreFixtureRows(db, steps, apply);

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
		title: "Inventory Validation Received Backorder",
		orderId: FIXTURE.saleOrderId,
		slug: FIXTURE.saleSlug,
		type: "order",
		status: "Active",
		inventoryStatus: "ORDERED",
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
			meta: true,
		},
	});
	const desiredLineItemData = {
		uid: FIXTURE.lineUid,
		title: FIXTURE.lineTitle,
		description: `${SEED_FIXTURE_ID} validation fixture line`,
		qty: 2,
		lineItemType: "SALE" as const,
		inventoryVariantId: variantId,
		inventoryId: itemId,
		inventoryCategoryId: categoryId,
		saleId,
		meta: {
			validationFixture: true,
			seedFixtureId: SEED_FIXTURE_ID,
			fulfillment: {
				receivedInboundBackorder: true,
			},
		},
	};
	const lineItemChanges = diffFields(existingLineItem, {
		...desiredLineItemData,
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
		inventoryId: plannedRef(itemId, FIXTURE.itemUid),
		inventoryCategoryId: plannedRef(categoryId, FIXTURE.categoryUid),
		saleId: plannedRef(saleId, FIXTURE.saleOrderId),
	});
	const lineItemStep = pushStep(
		steps,
		"LineItem",
		existingLineItem,
		lineItemChanges,
		FIXTURE.lineUid,
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
		qtyAllocated: 0,
		qtyInbound: 1,
		qtyReceived: 1,
		status: "partially_received" as const,
	};
	const lineComponentChanges = diffFields(existingLineComponent, {
		...desiredLineComponentData,
		lineItemId: plannedRef(lineItemId, FIXTURE.lineUid),
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

	const existingShipment = await db.inboundShipment.findFirst({
		where: { reference: FIXTURE.shipmentReference },
		select: {
			id: true,
			supplierId: true,
			status: true,
			reference: true,
			totalValue: true,
			progress: true,
		},
	});
	const desiredShipmentData = {
		supplierId,
		status: "completed" as const,
		reference: FIXTURE.shipmentReference,
		totalValue: 0,
		progress: 100,
	};
	const shipmentChanges = diffFields(existingShipment, {
		...desiredShipmentData,
		supplierId: plannedRef(supplierId, FIXTURE.supplierUid),
	});
	const shipmentStep = pushStep(
		steps,
		"InboundShipment",
		existingShipment,
		shipmentChanges,
		FIXTURE.shipmentReference,
	);
	const shipment =
		apply && shipmentStep.action == "create"
			? await db.inboundShipment.create({
					data: desiredShipmentData,
					select: { id: true },
				})
			: apply && shipmentStep.action == "update" && existingShipment
				? await db.inboundShipment.update({
						where: { id: existingShipment.id },
						data: shipmentChanges,
						select: { id: true },
					})
				: existingShipment;
	const shipmentId = shipment?.id ?? existingShipment?.id ?? -1;

	const existingShipmentItem =
		shipmentId > 0 && variantId > 0
			? await db.inboundShipmentItem.findFirst({
					where: {
						inboundId: shipmentId,
						inventoryVariantId: variantId,
					},
					select: {
						id: true,
						inboundId: true,
						inventoryVariantId: true,
						qty: true,
						unitPrice: true,
						qtyGood: true,
						qtyIssue: true,
					},
				})
			: null;
	const desiredShipmentItemData = {
		inboundId: shipmentId,
		inventoryVariantId: variantId,
		qty: 2,
		unitPrice: 0,
		qtyGood: 1,
		qtyIssue: 0,
	};
	const shipmentItemChanges = diffFields(existingShipmentItem, {
		...desiredShipmentItemData,
		inboundId: plannedRef(shipmentId, FIXTURE.shipmentReference),
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
	});
	const shipmentItemStep = pushStep(
		steps,
		"InboundShipmentItem",
		existingShipmentItem,
		shipmentItemChanges,
	);
	const shipmentItem =
		apply && shipmentItemStep.action == "create"
			? await db.inboundShipmentItem.create({
					data: desiredShipmentItemData,
					select: { id: true },
				})
			: apply && shipmentItemStep.action == "update" && existingShipmentItem
				? await db.inboundShipmentItem.update({
						where: { id: existingShipmentItem.id },
						data: shipmentItemChanges,
						select: { id: true },
					})
				: existingShipmentItem;
	const shipmentItemId = shipmentItem?.id ?? existingShipmentItem?.id ?? -1;

	const existingDemand =
		lineComponentId > 0 && variantId > 0
			? await db.inboundDemand.findFirst({
					where: {
						lineItemComponentId: lineComponentId,
						inventoryVariantId: variantId,
						status: {
							in: ["partially_received", "received"],
						},
					},
					select: {
						id: true,
						lineItemComponentId: true,
						inventoryVariantId: true,
						qty: true,
						qtyReceived: true,
						inboundShipmentItemId: true,
						status: true,
						notes: true,
					},
				})
			: null;
	const desiredDemandData = {
		lineItemComponentId: lineComponentId,
		inventoryVariantId: variantId,
		qty: 2,
		qtyReceived: 1,
		inboundShipmentItemId: shipmentItemId,
		status: "partially_received" as const,
		notes: `${SEED_FIXTURE_ID} received inbound backorder validation fixture`,
	};
	const demandChanges = diffFields(existingDemand, {
		...desiredDemandData,
		lineItemComponentId: plannedRef(lineComponentId, "line component"),
		inventoryVariantId: plannedRef(variantId, FIXTURE.variantUid),
		inboundShipmentItemId: plannedRef(shipmentItemId, "inbound shipment item"),
	});
	const demandStep = pushStep(
		steps,
		"InboundDemand",
		existingDemand,
		demandChanges,
	);
	if (apply && demandStep.action == "create") {
		await db.inboundDemand.create({
			data: desiredDemandData,
			select: { id: true },
		});
	} else if (apply && demandStep.action == "update" && existingDemand) {
		await db.inboundDemand.update({
			where: { id: existingDemand.id },
			data: demandChanges,
			select: { id: true },
		});
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

	const lineItem = await db.lineItem.findFirst({
		where: { uid: FIXTURE.lineUid, deletedAt: null },
		select: { id: true },
	});
	const lineComponent = lineItem
		? await db.lineItemComponents.findFirst({
				where: { lineItemId: lineItem.id },
				select: { id: true },
			})
		: null;
	const demand = lineComponent
		? await db.inboundDemand.findFirst({
				where: { lineItemComponentId: lineComponent.id, deletedAt: null },
				select: { id: true },
			})
		: null;
	const demandStep: SeedStep = {
		action: demand ? "soft-delete" : "missing",
		model: "InboundDemand",
		id: demand?.id,
		changes: demand ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(demandStep);
	if (apply && demand) {
		await db.inboundDemand.update({
			where: { id: demand.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const shipment = await db.inboundShipment.findFirst({
		where: { reference: FIXTURE.shipmentReference, deletedAt: null },
		select: { id: true },
	});
	const shipmentItem = shipment
		? await db.inboundShipmentItem.findFirst({
				where: { inboundId: shipment.id, deletedAt: null },
				select: { id: true },
			})
		: null;
	const shipmentItemStep: SeedStep = {
		action: shipmentItem ? "soft-delete" : "missing",
		model: "InboundShipmentItem",
		id: shipmentItem?.id,
		changes: shipmentItem ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(shipmentItemStep);
	if (apply && shipmentItem) {
		await db.inboundShipmentItem.update({
			where: { id: shipmentItem.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const shipmentStep: SeedStep = {
		action: shipment ? "soft-delete" : "missing",
		model: "InboundShipment",
		uid: FIXTURE.shipmentReference,
		id: shipment?.id,
		changes: shipment ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(shipmentStep);
	if (apply && shipment) {
		await db.inboundShipment.update({
			where: { id: shipment.id },
			data: { deletedAt },
			select: { id: true },
		});
	}

	const lineComponentStep: SeedStep = {
		action: lineComponent ? "cancel" : "missing",
		model: "LineItemComponents",
		id: lineComponent?.id,
		changes: lineComponent ? { status: "cancelled", qtyInbound: 0, qtyReceived: 0 } : {},
	};
	steps.push(lineComponentStep);
	if (apply && lineComponent) {
		await db.lineItemComponents.update({
			where: { id: lineComponent.id },
			data: { status: "cancelled", qtyInbound: 0, qtyReceived: 0 },
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
					location: "validation-fixture",
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

	const sale = await db.salesOrders.findFirst({
		where: { orderId: FIXTURE.saleOrderId, type: "order", deletedAt: null },
		select: { id: true },
	});
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

	const supplier = await db.supplier.findFirst({
		where: { uid: FIXTURE.supplierUid, deletedAt: null },
		select: { id: true },
	});
	const supplierStep: SeedStep = {
		action: supplier ? "soft-delete" : "missing",
		model: "Supplier",
		uid: FIXTURE.supplierUid,
		id: supplier?.id,
		changes: supplier ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(supplierStep);
	if (apply && supplier) {
		await db.supplier.update({
			where: { id: supplier.id },
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
	console.log("Inventory validation received-backorder fixture seed");
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
		console.log("No data was written. Re-run with --apply to create or repair INV-FIX-RECEIVED.");
	} else if (payload.mode == "rollback-dry-run") {
		console.log(
			"No data was written. Re-run with --rollback --apply to soft-delete/cancel INV-FIX-RECEIVED rows.",
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
		`[inventory-validation-seed-received-fixture] ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	if (error instanceof UsageError) usage();
	process.exit(1);
});
