#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost/gnd-prisma2";

type CliOptions = {
	apply: boolean;
	json: boolean;
	rollback: boolean;
};

type SeedFixtureDefinition = {
	seedFixtureId: "INV-FIX-STOCK-LOW" | "INV-FIX-STOCK-SAFE";
	categoryUid: string;
	categoryTitle: string;
	itemUid: string;
	itemName: string;
	variantUid: string;
	variantSku: string;
	lowStockAlert: number | null;
	stockQty: number;
	stockPrice: number;
	stockLocation: string;
};

type SeedStep = {
	action: "create" | "update" | "unchanged" | "soft-delete" | "missing";
	model: "InventoryCategory" | "Inventory" | "InventoryVariant" | "InventoryStock";
	uid?: string;
	id?: number;
	changes: Record<string, unknown>;
};

type SeedResult = {
	seedFixtureId: string;
	steps: SeedStep[];
};

class UsageError extends Error {}

const STOCK_FIXTURES: SeedFixtureDefinition[] = [
	{
		seedFixtureId: "INV-FIX-STOCK-LOW",
		categoryUid: "inv-fix-stock-low-category",
		categoryTitle: "Inventory Validation Low Stock",
		itemUid: "inv-fix-stock-low-item",
		itemName: "Inventory Validation Low Stock Item",
		variantUid: "inv-fix-stock-low-variant",
		variantSku: "INV-FIX-STOCK-LOW",
		lowStockAlert: 5,
		stockQty: 0,
		stockPrice: 0,
		stockLocation: "validation-fixture",
	},
	{
		seedFixtureId: "INV-FIX-STOCK-SAFE",
		categoryUid: "inv-fix-stock-safe-category",
		categoryTitle: "Inventory Validation Safe Stock",
		itemUid: "inv-fix-stock-safe-item",
		itemName: "Inventory Validation Safe Stock Item",
		variantUid: "inv-fix-stock-safe-variant",
		variantSku: "INV-FIX-STOCK-SAFE",
		lowStockAlert: 2,
		stockQty: 10,
		stockPrice: 0,
		stockLocation: "validation-fixture",
	},
];

function usage() {
	console.log(
		[
			"Usage:",
			"  bun scripts/inventory-validation-seed-stock-fixtures.ts",
			"  bun scripts/inventory-validation-seed-stock-fixtures.ts --json",
			"  bun scripts/inventory-validation-seed-stock-fixtures.ts --apply",
			"  bun scripts/inventory-validation-seed-stock-fixtures.ts --rollback",
			"  bun scripts/inventory-validation-seed-stock-fixtures.ts --rollback --apply",
			"",
			"Options:",
			"  --apply  Write or repair the stock-only validation fixtures",
			"  --json   Print the dry-run/apply result as JSON",
			"  --rollback  Soft-delete stock-only validation fixtures instead of preparing them",
			"",
			"Default mode is dry-run. This script only prepares INV-FIX-STOCK-LOW and INV-FIX-STOCK-SAFE.",
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
	fixture: SeedFixtureDefinition,
	apply: boolean,
): Promise<SeedResult> {
	const steps: SeedStep[] = [];

	const existingCategory = await db.inventoryCategory.findFirst({
		where: {
			uid: fixture.categoryUid,
		},
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
		title: fixture.categoryTitle,
		uid: fixture.categoryUid,
		productKind: "inventory",
		stockMode: "monitored",
		description: `${fixture.seedFixtureId} validation fixture category`,
		meta: {
			validationFixture: true,
			seedFixtureId: fixture.seedFixtureId,
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
		uid: fixture.categoryUid,
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
		where: {
			uid: fixture.itemUid,
		},
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
		name: fixture.itemName,
		uid: fixture.itemUid,
		productKind: "inventory",
		sourceCustom: false,
		stockMode: "monitored",
		status: "published",
		description: `${fixture.seedFixtureId} validation fixture item`,
		inventoryCategoryId: categoryId,
	};
	const desiredItemDiff = {
		...desiredItemData,
		inventoryCategoryId:
			categoryId > 0 ? categoryId : `<planned ${fixture.categoryUid}>`,
	};
	const itemChanges = diffFields(existingItem, desiredItemDiff);
	const itemStep: SeedStep = {
		action: existingItem
			? Object.keys(itemChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "Inventory",
		uid: fixture.itemUid,
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
		where: {
			uid: fixture.variantUid,
		},
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
		uid: fixture.variantUid,
		sku: fixture.variantSku,
		status: "published",
		lowStockAlert: fixture.lowStockAlert,
		description: `${fixture.seedFixtureId} validation fixture variant`,
		inventoryId: itemId,
	};
	const desiredVariantDiff = {
		...desiredVariantData,
		inventoryId: itemId > 0 ? itemId : `<planned ${fixture.itemUid}>`,
	};
	const variantChanges = diffFields(existingVariant, desiredVariantDiff);
	const variantStep: SeedStep = {
		action: existingVariant
			? Object.keys(variantChanges).length
				? "update"
				: "unchanged"
			: "create",
		model: "InventoryVariant",
		uid: fixture.variantUid,
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
			location: fixture.stockLocation,
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
		location: fixture.stockLocation,
		qty: fixture.stockQty,
		price: fixture.stockPrice,
	};
	const desiredStockDiff = {
		...desiredStockData,
		inventoryVariantId:
			variantId > 0 ? variantId : `<planned ${fixture.variantUid}>`,
	};
	const stockChanges = diffFields(existingStock, desiredStockDiff);
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
		seedFixtureId: fixture.seedFixtureId,
		steps,
	};
}

async function rollbackFixture(
	db: typeof import("../packages/db/src/index.ts").db,
	fixture: SeedFixtureDefinition,
	apply: boolean,
): Promise<SeedResult> {
	const deletedAt = new Date();
	const steps: SeedStep[] = [];

	const existingVariant = await db.inventoryVariant.findFirst({
		where: {
			uid: fixture.variantUid,
			deletedAt: null,
		},
		select: {
			id: true,
			uid: true,
		},
	});
	const existingStock = existingVariant
		? await db.inventoryStock.findFirst({
				where: {
					inventoryVariantId: existingVariant.id,
					location: fixture.stockLocation,
					deletedAt: null,
				},
				select: {
					id: true,
				},
			})
		: null;
	const stockStep: SeedStep = {
		action: existingStock ? "soft-delete" : "missing",
		model: "InventoryStock",
		id: existingStock?.id,
		changes: existingStock ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(stockStep);
	if (apply && existingStock) {
		await db.inventoryStock.update({
			where: {
				id: existingStock.id,
			},
			data: {
				deletedAt,
			},
			select: {
				id: true,
			},
		});
	}

	const variantStep: SeedStep = {
		action: existingVariant ? "soft-delete" : "missing",
		model: "InventoryVariant",
		uid: fixture.variantUid,
		id: existingVariant?.id,
		changes: existingVariant ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(variantStep);
	if (apply && existingVariant) {
		await db.inventoryVariant.update({
			where: {
				id: existingVariant.id,
			},
			data: {
				deletedAt,
			},
			select: {
				id: true,
			},
		});
	}

	const existingItem = await db.inventory.findFirst({
		where: {
			uid: fixture.itemUid,
			deletedAt: null,
		},
		select: {
			id: true,
			uid: true,
		},
	});
	const itemStep: SeedStep = {
		action: existingItem ? "soft-delete" : "missing",
		model: "Inventory",
		uid: fixture.itemUid,
		id: existingItem?.id,
		changes: existingItem ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(itemStep);
	if (apply && existingItem) {
		await db.inventory.update({
			where: {
				id: existingItem.id,
			},
			data: {
				deletedAt,
			},
			select: {
				id: true,
			},
		});
	}

	const existingCategory = await db.inventoryCategory.findFirst({
		where: {
			uid: fixture.categoryUid,
			deletedAt: null,
		},
		select: {
			id: true,
			uid: true,
		},
	});
	const categoryStep: SeedStep = {
		action: existingCategory ? "soft-delete" : "missing",
		model: "InventoryCategory",
		uid: fixture.categoryUid,
		id: existingCategory?.id,
		changes: existingCategory ? { deletedAt: deletedAt.toISOString() } : {},
	};
	steps.push(categoryStep);
	if (apply && existingCategory) {
		await db.inventoryCategory.update({
			where: {
				id: existingCategory.id,
			},
			data: {
				deletedAt,
			},
			select: {
				id: true,
			},
		});
	}

	return {
		seedFixtureId: fixture.seedFixtureId,
		steps,
	};
}

function printHumanResult(payload: {
	mode: "dry-run" | "apply" | "rollback-dry-run" | "rollback-apply";
	generatedAt: string;
	databaseUrl: string;
	results: SeedResult[];
}) {
	console.log("Inventory validation stock fixture seed");
	console.log(`mode: ${payload.mode}`);
	console.log(`generatedAt: ${payload.generatedAt}`);
	console.log(`database: ${payload.databaseUrl}`);
	console.log("");

	for (const result of payload.results) {
		console.log(result.seedFixtureId);
		for (const step of result.steps) {
			const target = step.uid ? `${step.model}(${step.uid})` : step.model;
			console.log(`  - ${step.action}: ${target}${step.id ? ` id=${step.id}` : ""}`);
			if (Object.keys(step.changes).length) {
				console.log(`    changes: ${JSON.stringify(step.changes)}`);
			}
		}
		console.log("");
	}

	if (payload.mode == "dry-run") {
		console.log("No data was written. Re-run with --apply to create or repair these two stock-only fixtures.");
	} else if (payload.mode == "rollback-dry-run") {
		console.log("No data was written. Re-run with --rollback --apply to soft-delete these two stock-only fixtures.");
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
		const results: SeedResult[] = [];
		for (const fixture of STOCK_FIXTURES) {
			results.push(
				options.rollback
					? await rollbackFixture(db, fixture, options.apply)
					: await prepareFixture(db, fixture, options.apply),
			);
		}

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
			results,
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
		`[inventory-validation-seed-stock-fixtures] ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	if (error instanceof UsageError) usage();
	process.exit(1);
});
