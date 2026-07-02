#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";
const REVIEWED_MISSING_SALES_BACKFILL_BATCH_SIZE = 50;
const REVIEWED_MISSING_SALES_BACKFILL_CLASSES = [
	"active_sales_status_candidate",
	"statusless_order_id_candidate",
];

type CliOptions = {
	json: boolean;
	markdown: boolean;
	limit: number;
	sampleLimit: number;
};

class UsageError extends Error {}

function chunkNumbers(values: number[], size: number) {
	const chunks: number[][] = [];
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size));
	}
	return chunks;
}

function jsonInline(value: unknown) {
	return JSON.stringify(value);
}

function usage() {
	console.log(
		[
			"Usage:",
			"  bun run inventory:reconciliation-evidence",
			"  bun run inventory:reconciliation-evidence --markdown",
			"  bun run inventory:reconciliation-evidence --json",
			"  bun run inventory:reconciliation-evidence --limit 200 --sample-limit 10",
			"",
			"Options:",
			"  --json              Print the machine-readable evidence payload",
			"  --markdown          Print a Markdown snapshot for Brain evidence docs",
			"  --limit <n>         Reconciliation line limit, 1-200, default 200",
			"  --sample-limit <n>  Sample size, 1-20 for monitor evidence, default 10",
		].join("\n"),
	);
}

function parseBoundedInteger(
	name: string,
	value: string | undefined,
	min: number,
	max: number,
) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
		throw new UsageError(`${name} must be an integer from ${min} to ${max}.`);
	}
	return parsed;
}

function readOptionValue(argv: string[], index: number, name: string) {
	const next = argv[index + 1];
	if (!next || next.startsWith("--")) {
		throw new UsageError(`${name} requires a value.`);
	}
	return next;
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		json: false,
		markdown: true,
		limit: 200,
		sampleLimit: 10,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			usage();
			process.exit(0);
		}
		if (arg === "--json") {
			options.json = true;
			options.markdown = false;
			continue;
		}
		if (arg === "--markdown") {
			options.markdown = true;
			options.json = false;
			continue;
		}
		if (arg === "--limit") {
			options.limit = parseBoundedInteger(
				arg,
				readOptionValue(argv, index, arg),
				1,
				200,
			);
			index += 1;
			continue;
		}
		if (arg.startsWith("--limit=")) {
			options.limit = parseBoundedInteger(
				"--limit",
				arg.slice("--limit=".length),
				1,
				200,
			);
			continue;
		}
		if (arg === "--sample-limit") {
			options.sampleLimit = parseBoundedInteger(
				arg,
				readOptionValue(argv, index, arg),
				1,
				20,
			);
			index += 1;
			continue;
		}
		if (arg.startsWith("--sample-limit=")) {
			options.sampleLimit = parseBoundedInteger(
				"--sample-limit",
				arg.slice("--sample-limit=".length),
				1,
				20,
			);
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

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

function inventorySyncSource(meta: unknown) {
	const sync = asRecord(asRecord(meta).inventorySync);
	return typeof sync.source === "string" ? sync.source : "unknown";
}

function inventorySyncComponentCount(meta: unknown) {
	const sync = asRecord(asRecord(meta).inventorySync);
	return typeof sync.componentCount === "number" ? sync.componentCount : null;
}

function addCount(record: Record<string, number>, key: string) {
	record[key] = (record[key] || 0) + 1;
}

function normalizedText(value: unknown) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function yearBucket(value: unknown) {
	if (!(value instanceof Date)) return "unknown";
	return String(value.getFullYear());
}

function classifyMissingSale(row: any) {
	const status = normalizedText(row.status);
	const orderId = normalizedText(row.orderId);
	const prodStatus = normalizedText(row.prodStatus);
	const inventoryStatus = normalizedText(row.inventoryStatus);

	if (!status) {
		if (orderId.startsWith("quo-")) {
			return {
				classification: "statusless_quote_id_review",
				reviewAction:
					"Order id indicates a quote; decide whether statusless quote rows belong in cutover evidence.",
			};
		}
		if (orderId.startsWith("ord-")) {
			return {
				classification: "statusless_order_id_candidate",
				reviewAction:
					"Order id indicates an order; review as a possible scoped backfill candidate.",
			};
		}
		return {
			classification: "missing_status_review",
			reviewAction:
				"Review statusless sale before deciding whether it belongs in cutover backfill.",
		};
	}

	if (status.includes("quote")) {
		return {
			classification: "quote_status_review",
			reviewAction:
				"Decide whether quote rows should be included in sales inventory cutover evidence or scoped out.",
		};
	}

	if (
		status.includes("delivered") ||
		status.includes("fulfilled") ||
		status.includes("cancel") ||
		status.includes("closed") ||
		status.includes("archived") ||
		status.includes("void") ||
		status.includes("lost") ||
		status.includes("hx")
	) {
		return {
			classification: "terminal_or_history_status_review",
			reviewAction:
				"Do not blindly backfill; decide whether historical or terminal orders are in cutover scope.",
		};
	}

	if (prodStatus.includes("complete") || prodStatus.includes("completed")) {
		return {
			classification: "production_completed_status_review",
			reviewAction:
				"Review completed-production sales without inventory lines before broad backfill.",
		};
	}

	if (inventoryStatus) {
		return {
			classification: "manual_inventory_status_without_lines",
			reviewAction:
				"Review manual inventory prompt state before first inventory sync.",
		};
	}

	return {
		classification: "active_sales_status_candidate",
		reviewAction:
			"Candidate for explicit reviewed backfill if current sales orders are in cutover scope.",
	};
}

function compactSample(row: any, classification: string, reviewAction: string) {
	return {
		classification,
		salesOrderId: row.id,
		orderId: row.orderId,
		status: row.status,
		prodStatus: row.prodStatus,
		inventoryStatus: row.inventoryStatus,
		createdAt: row.createdAt?.toISOString?.() ?? null,
		updatedAt: row.updatedAt?.toISOString?.() ?? null,
		reviewAction,
	};
}

function readNumberValue(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function readStringValue(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadataArray(value: unknown) {
	return Array.isArray(value) ? value : [];
}

function hasExplicitInventoryMappingHint(meta: unknown) {
	const root = asRecord(meta);
	const nestedMeta = asRecord(root.meta);
	const inventory = asRecord(root.inventory);
	const nestedInventory = asRecord(nestedMeta.inventory);

	const inventoryId =
		readNumberValue(root.inventoryId) ??
		readNumberValue(nestedMeta.inventoryId) ??
		readNumberValue(inventory.id) ??
		readNumberValue(nestedInventory.id);
	const inventoryVariantId =
		readNumberValue(root.inventoryVariantId) ??
		readNumberValue(nestedMeta.inventoryVariantId) ??
		readNumberValue(inventory.variantId) ??
		readNumberValue(inventory.inventoryVariantId) ??
		readNumberValue(nestedInventory.variantId) ??
		readNumberValue(nestedInventory.inventoryVariantId);
	const inventoryCategoryId =
		readNumberValue(root.inventoryCategoryId) ??
		readNumberValue(nestedMeta.inventoryCategoryId) ??
		readNumberValue(inventory.categoryId) ??
		readNumberValue(inventory.inventoryCategoryId) ??
		readNumberValue(nestedInventory.categoryId) ??
		readNumberValue(nestedInventory.inventoryCategoryId);

	return Boolean(inventoryId && inventoryVariantId && inventoryCategoryId);
}

function hasHousePackageMappingHint(item: any) {
	const metaHpt = asRecord(asRecord(item.meta).housePackageTool);
	const hpt =
		item.housePackageTool && !item.housePackageTool.deletedAt
			? item.housePackageTool
			: metaHpt;
	const stepProduct = asRecord(hpt.stepProduct);
	const step = asRecord(stepProduct.step);
	if (readStringValue(stepProduct.uid) && readStringValue(step.uid)) {
		return true;
	}

	for (const rawDoor of metadataArray(hpt.doors)) {
		const doorStepProduct = asRecord(asRecord(rawDoor).stepProduct);
		const doorStep = asRecord(doorStepProduct.step);
		if (readStringValue(doorStepProduct.uid) && readStringValue(doorStep.uid)) {
			return true;
		}
	}

	return false;
}

function hasShelfMappingHint(item: any) {
	const itemMeta = asRecord(item.meta);
	const shelves = item.shelfItems?.length
		? item.shelfItems
		: metadataArray(itemMeta.shelfItems);
	if (shelves.length !== 1) return false;

	const shelf = asRecord(shelves[0]);
	const shelfMeta = asRecord(shelf.meta);
	const productId =
		readNumberValue(shelf.productId) ?? readNumberValue(shelf.id);
	const categoryId =
		readNumberValue(shelf.categoryId) ??
		readNumberValue(shelfMeta.shelfParentCategoryId);

	return Boolean(productId && categoryId);
}

function hasFormStepMappingHint(item: any) {
	const itemMeta = asRecord(item.meta);
	const formSteps = item.formSteps?.length
		? item.formSteps
		: metadataArray(itemMeta.formSteps);
	if (formSteps.length !== 1) return false;

	const rawStep = asRecord(formSteps[0]);
	const step = asRecord(rawStep.step);
	const component = asRecord(rawStep.component);
	const stepMeta = asRecord(rawStep.meta);
	const selectedComponent = asRecord(
		metadataArray(stepMeta.selectedComponents)[0],
	);

	const sourceUid =
		readStringValue(rawStep.prodUid) ??
		readStringValue(component.uid) ??
		readStringValue(selectedComponent.uid);
	const categoryUid = readStringValue(step.uid);

	return Boolean(sourceUid && categoryUid);
}

function hasDeterministicMappingHint(item: any) {
	return (
		hasExplicitInventoryMappingHint(item.meta) ||
		hasHousePackageMappingHint(item) ||
		hasShelfMappingHint(item) ||
		hasFormStepMappingHint(item)
	);
}

function firstMetadataArray(...values: unknown[]) {
	for (const value of values) {
		const array = metadataArray(value);
		if (array.length) return array;
	}
	return [];
}

function sourceFormSteps(item: any) {
	const itemMeta = asRecord(item?.meta);
	const nestedMeta = asRecord(itemMeta.meta);
	return item?.formSteps?.length
		? item.formSteps
		: firstMetadataArray(itemMeta.formSteps, nestedMeta.formSteps);
}

function sourceShelfItems(item: any) {
	const itemMeta = asRecord(item?.meta);
	const nestedMeta = asRecord(itemMeta.meta);
	return item?.shelfItems?.length
		? item.shelfItems
		: firstMetadataArray(itemMeta.shelfItems, nestedMeta.shelfItems);
}

function sourceHousePackageTool(item: any) {
	if (item?.housePackageTool && !item.housePackageTool.deletedAt) {
		return item.housePackageTool;
	}

	const itemMeta = asRecord(item?.meta);
	const nestedMeta = asRecord(itemMeta.meta);
	const metadataHpt = asRecord(itemMeta.housePackageTool);
	if (Object.keys(metadataHpt).length) return metadataHpt;
	const nestedHpt = asRecord(nestedMeta.housePackageTool);
	if (Object.keys(nestedHpt).length) return nestedHpt;
	return null;
}

function componentSnapshotByIdForEvidence(formSteps: any[]) {
	const byId = new Map<number, { uid: string | null; stepUid: string | null }>();
	for (const rawStep of formSteps) {
		const step = asRecord(rawStep);
		const stepMeta = asRecord(step.meta);
		const stepRecord = asRecord(step.step);
		const stepUid = readStringValue(stepRecord.uid);
		for (const rawComponent of metadataArray(stepMeta.selectedComponents)) {
			const component = asRecord(rawComponent);
			const id = readNumberValue(component.id);
			if (!id) continue;
			byId.set(id, {
				uid: readStringValue(component.uid),
				stepUid,
			});
		}
	}
	return byId;
}

function countFormStepComponentHints(formSteps: any[]) {
	return formSteps.filter((rawStep) => {
		const step = asRecord(rawStep);
		const stepMeta = asRecord(step.meta);
		const component = asRecord(step.component);
		const selectedComponent = asRecord(
			metadataArray(stepMeta.selectedComponents)[0],
		);
		const sourceUid =
			readStringValue(step.prodUid) ??
			readStringValue(component.uid) ??
			readStringValue(selectedComponent.uid);
		const categoryUid = readStringValue(asRecord(step.step).uid);
		return Boolean(sourceUid && categoryUid);
	}).length;
}

function countShelfComponentHints(shelfItems: any[]) {
	return shelfItems.filter((rawShelf) => {
		const shelf = asRecord(rawShelf);
		const shelfMeta = asRecord(shelf.meta);
		const productId =
			readNumberValue(shelf.productId) ?? readNumberValue(shelf.id);
		const categoryId =
			readNumberValue(shelf.categoryId) ??
			readNumberValue(shelfMeta.shelfParentCategoryId);
		return Boolean(productId && categoryId);
	}).length;
}

function housePackageComponentHintStats(hpt: any, formSteps: any[]) {
	if (!hpt) {
		return {
			exists: false,
			doorCount: 0,
			candidateHintCount: 0,
		};
	}

	const hptRecord = asRecord(hpt);
	const snapshots = componentSnapshotByIdForEvidence(formSteps);
	const doors = metadataArray(hptRecord.doors);
	const hasRootCandidate = Boolean(
		readStringValue(asRecord(hptRecord.stepProduct).uid) &&
			readStringValue(asRecord(asRecord(hptRecord.stepProduct).step).uid),
	);

	if (!doors.length) {
		return {
			exists: true,
			doorCount: 0,
			candidateHintCount: hasRootCandidate ? 1 : 0,
		};
	}

	const doorHintCount = doors.filter((rawDoor) => {
		const door = asRecord(rawDoor);
		const stepProduct = asRecord(door.stepProduct);
		const step = asRecord(stepProduct.step);
		const snapshot = readNumberValue(door.stepProductId)
			? snapshots.get(readNumberValue(door.stepProductId) || 0)
			: null;
		const sourceUid = readStringValue(stepProduct.uid) ?? snapshot?.uid;
		const categoryUid = readStringValue(step.uid) ?? snapshot?.stepUid;
		return Boolean(sourceUid && categoryUid);
	}).length;

	return {
		exists: true,
		doorCount: doors.length,
		candidateHintCount: doorHintCount,
	};
}

function classifyZeroComponentLine(row: any) {
	const item = row.salesItem;
	if (!item) {
		return {
			reason: "missing_linked_sales_item",
			hasLinkedSalesItem: false,
			hasExplicitParentMapping: false,
			hasDeterministicParentMapping: false,
			formStepCount: 0,
			formStepCandidateHintCount: 0,
			shelfItemCount: 0,
			shelfCandidateHintCount: 0,
			hasHousePackageTool: false,
			housePackageDoorCount: 0,
			housePackageCandidateHintCount: 0,
			componentSourceCount: 0,
			componentCandidateHintCount: 0,
		};
	}

	const formSteps = sourceFormSteps(item);
	const shelfItems = sourceShelfItems(item);
	const hpt = sourceHousePackageTool(item);
	const hptStats = housePackageComponentHintStats(hpt, formSteps);
	const formStepCandidateHintCount = countFormStepComponentHints(formSteps);
	const shelfCandidateHintCount = countShelfComponentHints(shelfItems);
	const componentSourceCount =
		formSteps.length + shelfItems.length + (hptStats.exists ? 1 : 0);
	const componentCandidateHintCount =
		formStepCandidateHintCount +
		shelfCandidateHintCount +
		hptStats.candidateHintCount;
	const hasExplicitParentMapping = hasExplicitInventoryMappingHint(item.meta);
	const hasDeterministicParentMapping = hasDeterministicMappingHint(item);

	let reason = "component_sources_missing_required_mapping_fields";
	if (componentCandidateHintCount > 0) {
		reason = "component_hints_found_but_recorded_zero";
	} else if (hptStats.exists && hptStats.doorCount > 0) {
		reason = "house_package_doors_missing_component_mapping_fields";
	} else if (hptStats.exists) {
		reason = "house_package_root_missing_component_mapping_fields";
	} else if (formSteps.length) {
		reason = "form_steps_missing_component_mapping_fields";
	} else if (shelfItems.length) {
		reason = "shelf_items_missing_component_mapping_fields";
	} else if (componentSourceCount === 0 && hasExplicitParentMapping) {
		reason = "explicit_parent_mapping_without_component_sources";
	} else if (componentSourceCount === 0) {
		reason = "parent_line_without_component_sources";
	}

	return {
		reason,
		hasLinkedSalesItem: true,
		hasExplicitParentMapping,
		hasDeterministicParentMapping,
		formStepCount: formSteps.length,
		formStepCandidateHintCount,
		shelfItemCount: shelfItems.length,
		shelfCandidateHintCount,
		hasHousePackageTool: hptStats.exists,
		housePackageDoorCount: hptStats.doorCount,
		housePackageCandidateHintCount: hptStats.candidateHintCount,
		componentSourceCount,
		componentCandidateHintCount,
	};
}

async function buildReviewedBackfillReadiness(
	db: any,
	salesOrderIds: number[],
	options: { sampleLimit: number },
) {
	if (!salesOrderIds.length) {
		return {
			materializableSalesOrderIds: [] as number[],
			mappingBlockedCount: 0,
			mappingBlockedSamples: [] as Array<Record<string, unknown>>,
		};
	}

	const rows = await db.salesOrders.findMany({
		where: {
			id: {
				in: salesOrderIds,
			},
			deletedAt: null,
		},
		orderBy: {
			id: "asc",
		},
		select: {
			id: true,
			orderId: true,
			status: true,
			prodStatus: true,
			inventoryStatus: true,
			createdAt: true,
			updatedAt: true,
			items: {
				where: {
					deletedAt: null,
				},
				select: {
					id: true,
					meta: true,
					formSteps: {
						where: {
							deletedAt: null,
						},
						select: {
							prodUid: true,
							value: true,
							meta: true,
							step: {
								select: {
									uid: true,
								},
							},
							component: {
								select: {
									uid: true,
								},
							},
						},
					},
					shelfItems: {
						where: {
							deletedAt: null,
						},
						select: {
							id: true,
							productId: true,
							categoryId: true,
							meta: true,
						},
					},
					housePackageTool: {
						select: {
							deletedAt: true,
							meta: true,
							stepProduct: {
								select: {
									uid: true,
									step: {
										select: {
											uid: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	const materializableSalesOrderIds: number[] = [];
	const mappingBlockedSamples: Array<Record<string, unknown>> = [];
	let mappingBlockedCount = 0;

	for (const row of rows) {
		const materializable = row.items.some((item: any) =>
			hasDeterministicMappingHint(item),
		);
		if (materializable) {
			materializableSalesOrderIds.push(row.id);
			continue;
		}

		mappingBlockedCount += 1;
		if (mappingBlockedSamples.length < options.sampleLimit) {
			mappingBlockedSamples.push({
				salesOrderId: row.id,
				orderId: row.orderId,
				status: row.status,
				prodStatus: row.prodStatus,
				inventoryStatus: row.inventoryStatus,
				itemCount: row.items.length,
				reason: row.items.length
					? "no_sales_items_with_deterministic_inventory_mapping"
					: "no_active_sales_items",
			});
		}
	}

	return {
		materializableSalesOrderIds,
		mappingBlockedCount,
		mappingBlockedSamples,
	};
}

async function buildMissingSalesScopeClassification(
	db: any,
	options: { sampleLimit: number },
) {
	const rows = await db.salesOrders.findMany({
		where: {
			deletedAt: null,
			lineItems: {
				none: {
					deletedAt: null,
					lineItemType: "SALE",
				},
			},
		},
		orderBy: {
			id: "asc",
		},
		select: {
			id: true,
			orderId: true,
			status: true,
			inventoryStatus: true,
			prodStatus: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	const byClass: Record<string, number> = {};
	const byStatus: Record<string, number> = {};
	const byProdStatus: Record<string, number> = {};
	const byCreatedYear: Record<string, number> = {};
	const samples: Array<Record<string, unknown>> = [];
	const samplesByClass: Record<string, Array<Record<string, unknown>>> = {};
	const reviewedBackfillCandidateSalesOrderIds: number[] = [];
	const reviewedBackfillCandidateSamples: Array<Record<string, unknown>> = [];
	let reviewedBackfillCandidateCount = 0;
	const perClassLimit = Math.max(1, Math.min(options.sampleLimit, 3));
	const reviewedBackfillClassSet = new Set(
		REVIEWED_MISSING_SALES_BACKFILL_CLASSES,
	);

	for (const row of rows) {
		const scope = classifyMissingSale(row);
		addCount(byClass, scope.classification);
		addCount(byStatus, String(row.status || "unknown"));
		addCount(byProdStatus, String(row.prodStatus || "unknown"));
		addCount(byCreatedYear, yearBucket(row.createdAt));

		const sample = compactSample(
			row,
			scope.classification,
			scope.reviewAction,
		);
		if (samples.length < options.sampleLimit) {
			samples.push(sample);
		}
		samplesByClass[scope.classification] ||= [];
		if (samplesByClass[scope.classification].length < perClassLimit) {
			samplesByClass[scope.classification].push(sample);
		}
		if (reviewedBackfillClassSet.has(scope.classification)) {
			reviewedBackfillCandidateCount += 1;
			reviewedBackfillCandidateSalesOrderIds.push(row.id);
			if (reviewedBackfillCandidateSamples.length < options.sampleLimit) {
				reviewedBackfillCandidateSamples.push(sample);
			}
		}
	}

	const topEntries = (record: Record<string, number>, limit = 10) =>
		Object.entries(record)
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, limit);
	const reviewedBackfillReadiness = await buildReviewedBackfillReadiness(
		db,
		reviewedBackfillCandidateSalesOrderIds,
		options,
	);
	const reviewedBackfillBatchSalesOrderIds =
		reviewedBackfillReadiness.materializableSalesOrderIds.slice(
			0,
			REVIEWED_MISSING_SALES_BACKFILL_BATCH_SIZE,
		);

	return {
		status: rows.length ? "needs_scope_decision" : "clean",
		total: rows.length,
		byClass,
		byStatus: topEntries(byStatus),
		byProdStatus: topEntries(byProdStatus),
		byCreatedYear: topEntries(byCreatedYear),
		samples,
		samplesByClass,
		reviewedBackfill: {
			status: reviewedBackfillBatchSalesOrderIds.length
				? "batch_ready"
				: reviewedBackfillCandidateCount
					? "mapping_review_required"
					: "none",
			scope: "active_order_candidates",
			candidateClasses: REVIEWED_MISSING_SALES_BACKFILL_CLASSES,
			candidateCount: reviewedBackfillCandidateCount,
			materializableCandidateCount:
				reviewedBackfillReadiness.materializableSalesOrderIds.length,
			mappingBlockedCandidateCount:
				reviewedBackfillReadiness.mappingBlockedCount,
			batchSize: REVIEWED_MISSING_SALES_BACKFILL_BATCH_SIZE,
			salesOrderIds: reviewedBackfillBatchSalesOrderIds,
			remainingAfterBatchCount: Math.max(
				0,
				reviewedBackfillReadiness.materializableSalesOrderIds.length -
					reviewedBackfillBatchSalesOrderIds.length,
			),
			payload: reviewedBackfillBatchSalesOrderIds.length
				? {
						salesOrderIds: reviewedBackfillBatchSalesOrderIds,
						includeAlreadySynced: false,
						source: "repair",
						scope: "active_order_candidates",
					}
				: null,
			samples: reviewedBackfillCandidateSamples,
			mappingBlockedSamples: reviewedBackfillReadiness.mappingBlockedSamples,
		},
	};
}

function roundQuantity(value: number) {
	return Math.round(value * 1000) / 1000;
}

function quantity(value: unknown) {
	return Math.max(0, Number(value || 0));
}

function sumBy<T>(items: T[] | null | undefined, read: (item: T) => number) {
	return (items || []).reduce((total, item) => total + read(item), 0);
}

function isCompletedDelivery(delivery: any) {
	const deliveryStatus = String(delivery.delivery?.status || "").toLowerCase();
	const lineStatus = String(delivery.status || "").toLowerCase();
	return (
		deliveryStatus === "completed" ||
		deliveryStatus === "delivered" ||
		lineStatus === "completed" ||
		lineStatus === "delivered"
	);
}

function consumedUnitsForLine(line: any) {
	const orderedQty = quantity(line.qty ?? line.salesItem?.qty ?? 0);
	const components = line.components || [];
	const required = components.filter((component: any) => quantity(component.qty) > 0);
	const blockingComponents = required.length ? required : components;

	if (orderedQty <= 0 || !blockingComponents.length) return 0;

	const units = blockingComponents.map((component: any) => {
		const componentQty = quantity(component.qty);
		const perUnitQty = componentQty > 0 ? componentQty / orderedQty : 1;
		if (perUnitQty <= 0) return orderedQty;

		const consumedComponentQty = sumBy(component.stockAllocations, (allocation) =>
			allocation.status === "consumed" ? quantity(allocation.qty) : 0,
		);

		return Math.floor(consumedComponentQty / perUnitQty);
	});

	return roundQuantity(Math.max(0, Math.min(orderedQty, ...units)));
}

function classifyShipmentAllocationLine(line: any) {
	if (!line.components?.length) {
		return {
			classification: "missing_component_rows",
			severity: "error",
			reviewAction:
				"Regenerate inventory components before comparing shipment and allocation truth.",
			skipped: true,
		};
	}

	if (!line.salesItem) {
		return {
			classification: "missing_legacy_sales_item_link",
			severity: "warning",
			reviewAction:
				"Review whether this inventory SALE line should be linked to a legacy SalesItem or scoped out of shipment comparison.",
			skipped: true,
		};
	}

	const shippedQty = roundQuantity(
		sumBy(line.salesItem.itemDeliveries, (delivery) =>
			isCompletedDelivery(delivery) ? quantity(delivery.qty) : 0,
		),
	);
	const consumedQty = consumedUnitsForLine(line);
	const delta = roundQuantity(shippedQty - consumedQty);

	if (Math.abs(delta) <= 0.001) return null;

	if (delta > 0) {
		return {
			classification: "completed_delivery_exceeds_consumed_allocation",
			severity: "error",
			shippedQty,
			consumedQty,
			delta,
			reviewAction:
				"Completed legacy delivery exists without matching consumed inventory allocation quantity; review delivery truth before any repair.",
			skipped: false,
		};
	}

	return {
		classification: "consumed_allocation_exceeds_completed_delivery",
		severity: "error",
		shippedQty,
		consumedQty,
		delta,
		reviewAction:
			"Inventory allocation is consumed beyond completed legacy delivery quantity; review whether delivery compatibility rows need repair.",
		skipped: false,
	};
}

async function buildShipmentAllocationClassification(
	db: any,
	options: { limit: number; sampleLimit: number },
) {
	const lineItems = await db.lineItem.findMany({
		where: {
			deletedAt: null,
			lineItemType: "SALE",
		},
		orderBy: {
			id: "asc",
		},
		take: options.limit,
		select: {
			id: true,
			qty: true,
			saleId: true,
			sale: {
				select: {
					id: true,
					orderId: true,
				},
			},
			salesItemId: true,
			salesItem: {
				select: {
					id: true,
					qty: true,
					itemDeliveries: {
						where: {
							deletedAt: null,
						},
						select: {
							qty: true,
							status: true,
							packingStatus: true,
							delivery: {
								select: {
									status: true,
								},
							},
						},
					},
				},
			},
			components: {
				where: {
					status: {
						not: "cancelled",
					},
				},
				select: {
					id: true,
					qty: true,
					status: true,
					stockAllocations: {
						where: {
							deletedAt: null,
						},
						select: {
							qty: true,
							status: true,
						},
					},
				},
			},
		},
	});

	const byClass: Record<string, number> = {};
	const samples: Array<Record<string, unknown>> = [];
	let driftCount = 0;
	let skippedCount = 0;

	for (const line of lineItems) {
		const classification = classifyShipmentAllocationLine(line);
		if (!classification) continue;

		byClass[classification.classification] =
			(byClass[classification.classification] || 0) + 1;
		if (classification.skipped) {
			skippedCount += 1;
		} else {
			driftCount += 1;
		}

		if (samples.length < options.sampleLimit) {
			samples.push({
				classification: classification.classification,
				severity: classification.severity,
				salesOrderId: line.saleId ?? line.sale?.id ?? null,
				orderId: line.sale?.orderId ?? null,
				lineItemId: line.id ?? null,
				salesItemId: line.salesItemId ?? line.salesItem?.id ?? null,
				shippedQty: "shippedQty" in classification ? classification.shippedQty : null,
				consumedQty:
					"consumedQty" in classification ? classification.consumedQty : null,
				delta: "delta" in classification ? classification.delta : null,
				componentCount: line.components?.length ?? 0,
				reviewAction: classification.reviewAction,
			});
		}
	}

	return {
		status: driftCount || skippedCount ? "needs_review" : "clean",
		checkedLineCount: lineItems.length,
		driftCount,
		skippedCount,
		byClass,
		samples,
	};
}

function domainMarkdownRows(reconciliation: any) {
	return reconciliation.domainSummaries
		.map((domain: any) =>
			[
				`| ${domain.domain}`,
				domain.checkedCount,
				domain.driftCount,
				domain.skippedCount,
				domain.severity,
				domain.sampleCount,
				`${domain.skippedReasons.join("; ") || "-"} |`,
			].join(" | "),
		)
		.join("\n");
}

function renderMarkdown(payload: any) {
	const monitor = payload.monitor;
	const reconciliation = payload.reconciliation;
	const missingSalesScope = payload.missingSalesScope;
	const shipmentAllocation = payload.shipmentAllocation;
	const stale = payload.staleCleanupPreview;
	const componentless = payload.componentless;
	const repairPlan = payload.repairPlan;
	const clean =
		monitor.status === "synced" &&
		reconciliation.status === "synced" &&
		reconciliation.totalDriftCount === 0 &&
		reconciliation.skippedComparisonCount === 0 &&
		!reconciliation.hasMore;

	return [
		"# Inventory Reconciliation Evidence",
		"",
		`- Generated At: ${payload.generatedAt}`,
		`- Database: ${payload.databaseUrl}`,
		`- Result: ${clean ? "Clean" : "Not Clean"}`,
		`- Command: \`bun run inventory:reconciliation-evidence --markdown\``,
		"",
		"## Monitor Summary",
		`- Status: ${monitor.status}`,
		`- Sync Coverage: ${monitor.syncCoverageRate}%`,
		`- Missing Sales: ${monitor.missingSalesCount}`,
		`- Componentless Lines: ${monitor.componentlessLineItemCount}`,
		`- Componentless Sales: ${monitor.componentlessSalesCount}`,
		`- Stale Lines: ${monitor.staleInventoryLineItemCount}`,
		`- Stale Stock Allocations: ${monitor.staleStockAllocationCount}`,
		`- Stale Inbound Demand: ${monitor.staleInboundDemandCount}`,
		`- Failed Risk Count: ${monitor.failedRiskCount}`,
		`- Backfill Cursor: ${monitor.backfillCursorId ?? "-"}`,
		"",
		"## Missing Sales Scope Classification",
		`- Status: ${missingSalesScope.status}`,
		`- Total Missing Sales: ${missingSalesScope.total}`,
		`- By Class: ${Object.entries(missingSalesScope.byClass)
			.map(([name, count]) => `${name}=${count}`)
			.join(", ") || "-"}`,
		`- Top Statuses: ${missingSalesScope.byStatus
			.map(([name, count]: [string, number]) => `${name}=${count}`)
			.join(", ") || "-"}`,
		`- Top Production Statuses: ${missingSalesScope.byProdStatus
			.map(([name, count]: [string, number]) => `${name}=${count}`)
			.join(", ") || "-"}`,
		`- Created Years: ${missingSalesScope.byCreatedYear
			.map(([name, count]: [string, number]) => `${name}=${count}`)
			.join(", ") || "-"}`,
		`- Reviewed Backfill Scope: ${missingSalesScope.reviewedBackfill.scope}`,
		`- Reviewed Backfill Candidate Classes: ${missingSalesScope.reviewedBackfill.candidateClasses.join(", ")}`,
		`- Reviewed Backfill Candidate Count: ${missingSalesScope.reviewedBackfill.candidateCount}`,
		`- Reviewed Backfill Materializable Candidates: ${missingSalesScope.reviewedBackfill.materializableCandidateCount}`,
		`- Reviewed Backfill Mapping-Blocked Candidates: ${missingSalesScope.reviewedBackfill.mappingBlockedCandidateCount}`,
		`- First Reviewed Backfill Batch Ids: ${missingSalesScope.reviewedBackfill.salesOrderIds.join(", ") || "-"}`,
		`- Remaining Materializable Backfill Candidates After Batch: ${missingSalesScope.reviewedBackfill.remainingAfterBatchCount}`,
		`- Mapping-Blocked Sample Ids: ${missingSalesScope.reviewedBackfill.mappingBlockedSamples
			.map((sample: any) => sample.salesOrderId)
			.join(", ") || "-"}`,
		"",
		"| Class | Order | Sales Order | Status | Prod Status | Inventory Status | Review Action |",
		"| --- | --- | ---: | --- | --- | --- | --- |",
		...missingSalesScope.samples.map(
			(sample: any) =>
				`| ${sample.classification} | ${sample.orderId ?? "-"} | ${
					sample.salesOrderId ?? "-"
				} | ${sample.status ?? "-"} | ${sample.prodStatus ?? "-"} | ${
					sample.inventoryStatus ?? "-"
				} | ${String(sample.reviewAction).replaceAll("|", "\\|")} |`,
		),
		"",
		"## Reconciliation Summary",
		`- Status: ${reconciliation.status}`,
		`- Checked Lines: ${reconciliation.checkedLineCount}`,
		`- Drift Count: ${reconciliation.totalDriftCount}`,
		`- Skipped Comparisons: ${reconciliation.skippedComparisonCount}`,
		`- Has More: ${reconciliation.hasMore}`,
		`- Next Cursor: ${reconciliation.nextCursorId ?? "-"}`,
		"",
		"| Domain | Checked | Drift | Skipped | Severity | Samples | Skipped Reasons |",
		"| --- | ---: | ---: | ---: | --- | ---: | --- |",
		domainMarkdownRows(reconciliation),
		"",
		"## Shipment Allocation Classification",
		`- Status: ${shipmentAllocation.status}`,
		`- Checked Lines: ${shipmentAllocation.checkedLineCount}`,
		`- Drift Count: ${shipmentAllocation.driftCount}`,
		`- Skipped Count: ${shipmentAllocation.skippedCount}`,
		`- By Class: ${Object.entries(shipmentAllocation.byClass)
			.map(([name, count]) => `${name}=${count}`)
			.join(", ") || "-"}`,
		"",
		"| Class | Order | Line Item | Sales Item | Shipped | Consumed | Delta | Review Action |",
		"| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
		...shipmentAllocation.samples.map(
			(sample: any) =>
				`| ${sample.classification} | ${sample.orderId ?? "-"} | ${
					sample.lineItemId ?? "-"
				} | ${sample.salesItemId ?? "-"} | ${sample.shippedQty ?? "-"} | ${
					sample.consumedQty ?? "-"
				} | ${sample.delta ?? "-"} | ${String(sample.reviewAction).replaceAll(
					"|",
					"\\|",
				)} |`,
		),
		"",
		"## Stale Cleanup Dry Run",
		`- Matched Lines: ${stale.matchedCount}`,
		`- Component Count: ${stale.componentCount}`,
		`- Line Item Ids: ${stale.lineItemIds.join(", ") || "-"}`,
		`- Repair Candidate Line Ids: ${
			payload.repairCandidates.staleLineItemIds.join(", ") || "-"
		}`,
		"",
		"## Componentless Lines",
		`- Total: ${componentless.total}`,
		`- Repair Candidate Sales Order Ids: ${
			payload.repairCandidates.componentlessSalesOrderIds.join(", ") || "-"
		}`,
		`- Zero-Component Review Sales Order Ids: ${
			payload.repairCandidates.zeroComponentSalesOrderIds.join(", ") || "-"
		}`,
		`- By Source: ${Object.entries(componentless.bySource)
			.map(([source, count]) => `${source}=${count}`)
			.join(", ") || "-"}`,
		`- Zero-Component By Reason: ${Object.entries(
			componentless.zeroComponentByReason,
		)
			.map(([reason, count]) => `${reason}=${count}`)
			.join(", ") || "-"}`,
		`- Top Orders: ${componentless.topOrders
			.map(([orderId, count]: [string, number]) => `${orderId}=${count}`)
			.join(", ") || "-"}`,
		"",
		"| Line Item | Order | Sales Item | Source | Recorded Components | Reason | Shape | Title |",
		"| ---: | --- | ---: | --- | ---: | --- | --- | --- |",
		...componentless.samples.map(
			(sample: any) => {
				const classification = sample.zeroComponentClassification;
				const shape = classification
					? [
							`form=${classification.formStepCount}/${classification.formStepCandidateHintCount}`,
							`shelf=${classification.shelfItemCount}/${classification.shelfCandidateHintCount}`,
							`hpt=${classification.housePackageDoorCount}/${classification.housePackageCandidateHintCount}`,
							`parentMap=${classification.hasDeterministicParentMapping ? "yes" : "no"}`,
						].join("; ")
					: "-";
				return `| ${sample.lineItemId} | ${sample.orderId ?? "-"} | ${
					sample.salesItemId ?? "-"
				} | ${sample.source} | ${sample.recordedComponentCount ?? "-"} | ${
					classification?.reason ?? "-"
				} | ${shape} | ${String(sample.title ?? "-").replaceAll("|", "\\|")} |`;
			},
		),
		"",
		"| Zero-Component Reason | Order | Line Item | Sales Item | Source Shape |",
		"| --- | --- | ---: | ---: | --- |",
		...componentless.zeroComponentSamples.map((sample: any) => {
			const shape = [
				`sources=${sample.componentSourceCount}`,
				`hints=${sample.componentCandidateHintCount}`,
				`form=${sample.formStepCount}/${sample.formStepCandidateHintCount}`,
				`shelf=${sample.shelfItemCount}/${sample.shelfCandidateHintCount}`,
				`hpt=${sample.housePackageDoorCount}/${sample.housePackageCandidateHintCount}`,
				`parentMap=${sample.hasDeterministicParentMapping ? "yes" : "no"}`,
			].join("; ");
			return `| ${sample.reason} | ${sample.orderId ?? "-"} | ${
				sample.lineItemId ?? "-"
			} | ${sample.salesItemId ?? "-"} | ${shape} |`;
		}),
		"",
		"## Reviewed Repair Plan",
		`- Status: ${repairPlan.status}`,
		`- Mutates Data: ${repairPlan.mutatesData ? "yes" : "no"}`,
		`- Review Required: ${repairPlan.reviewRequired ? "yes" : "no"}`,
		`- Rerun Evidence: \`${repairPlan.rerunCommand}\``,
		"",
		...repairPlan.steps.flatMap((step: any, index: number) => [
			`### ${index + 1}. ${step.title}`,
			`- Status: ${step.status}`,
			`- Purpose: ${step.purpose}`,
			`- Safety: ${step.safety}`,
			...(step.dryRunPayload
				? [
						`- Dry-run ${step.entrypoint}: \`${jsonInline(
							step.dryRunPayload,
						)}\``,
					]
				: []),
			...(step.applyPayload
				? [
						`- Apply ${step.entrypoint} after review: \`${jsonInline(
							step.applyPayload,
						)}\``,
					]
				: []),
			...(step.payloadBatches?.length
				? step.payloadBatches.map(
						(batch: unknown, batchIndex: number) =>
							`- Batch ${batchIndex + 1} ${step.entrypoint}: \`${jsonInline(
								batch,
							)}\``,
					)
				: []),
			"",
		]),
		"## Gate Status",
		clean
			? "- Phase 8 clean reconciliation evidence is satisfied for this run."
			: "- Phase 8 clean reconciliation evidence is not satisfied for this run. Resolve missing backfill, componentless rows, stale rows, drift, skipped comparisons, and partial cursor state before moving to broad browser/operator proof.",
	].join("\n");
}

function buildRepairPlan(input: {
	monitor: any;
	reconciliation: any;
	missingSalesScope: any;
	shipmentAllocation: any;
	staleLineItemIds: number[];
	componentlessSalesOrderIds: number[];
	zeroComponentSalesOrderIds: number[];
}) {
	const staleLineItemIds = [...new Set(input.staleLineItemIds)].sort(
		(a, b) => a - b,
	);
	const componentlessSalesOrderIds = [
		...new Set(input.componentlessSalesOrderIds),
	].sort((a, b) => a - b);
	const zeroComponentSalesOrderIds = [
		...new Set(input.zeroComponentSalesOrderIds),
	].sort((a, b) => a - b);
	const steps: Array<Record<string, unknown>> = [];

	if (staleLineItemIds.length) {
		steps.push({
			id: "stale_line_cleanup",
			title: "Review and clean stale inventory sale lines",
			status: "review_required",
			entrypoint: "inventories.cleanupStaleSalesInventoryLineItems",
			purpose:
				"Remove inventory SALE line rows whose parent sale is missing/deleted, then clean only residue confirmed under those guarded line rows.",
			safety:
				"Dry-run first. Apply only if the dry-run still returns the exact reviewed line ids and counts.",
			dryRunPayload: {
				lineItemIds: staleLineItemIds,
				dryRun: true,
				limit: staleLineItemIds.length,
			},
			applyPayload: {
				lineItemIds: staleLineItemIds,
				dryRun: false,
				limit: staleLineItemIds.length,
			},
		});
	}

	if (componentlessSalesOrderIds.length) {
		const batches = chunkNumbers(componentlessSalesOrderIds, 50).map(
			(salesOrderIds) => ({
				salesOrderIds,
				includeAlreadySynced: true,
				source: "repair",
			}),
		);
		steps.push({
			id: "componentless_sales_repair",
			title: "Re-sync componentless manual inventory sales",
			status: "review_required",
			entrypoint: "inventories.backfillSalesInventorySync",
			purpose:
				"Re-run sales inventory sync for explicit componentless sales order ids so component rows can be regenerated from the current sales source.",
			safety:
				"Use explicit reviewed ids only. Keep source as repair and include already-synced rows so existing componentless SALE lines are reprocessed intentionally.",
			payloadBatches: batches,
		});
	}

	if (zeroComponentSalesOrderIds.length) {
		steps.push({
			id: "componentless_zero_component_review",
			title: "Review componentless lines with zero sync component candidates",
			status: "product_decision_required",
			entrypoint: "sales inventory component mapping review",
			purpose:
				"Review synced SALE lines whose source sync recorded zero component candidates. Re-running sync updates the parent line but cannot generate components until the sales item/component mapping scope is decided.",
			safety:
				"Do not loop these rows through componentless re-sync as a repair. Decide whether these line types are intentionally non-stock, need a component mapping rule, or should be excluded from inventory-backed reconciliation.",
			payloadBatches: chunkNumbers(zeroComponentSalesOrderIds, 50).map(
				(salesOrderIds) => ({
					salesOrderIds,
					reason: "inventorySync.componentCount=0",
				}),
			),
		});
	}

	if (input.monitor.missingSalesCount > 0) {
		const reviewedBackfill = input.missingSalesScope.reviewedBackfill;
		if (reviewedBackfill?.salesOrderIds?.length) {
			steps.push({
				id: "missing_sales_scoped_backfill",
				title: "Backfill reviewed active/order missing-sales batch",
				status: "review_required",
				entrypoint: "inventories.backfillSalesInventorySync",
				purpose:
					"Process the first explicit reviewed batch from active-status and statusless order-id missing-sales candidates, without touching quote, terminal/history, completed-production, manual-prompt, or unknown-status rows.",
				safety:
					"Use explicit reviewed ids only, rerun evidence after each batch, and keep broad cursor backfill disabled until non-active buckets have a product scope decision.",
				payloadBatches: [reviewedBackfill.payload],
			});
		}

		const reviewedClassSet = new Set(
			REVIEWED_MISSING_SALES_BACKFILL_CLASSES,
		);
		const reviewRequiredScope = Object.fromEntries(
			Object.entries(input.missingSalesScope.byClass).filter(
				([classification]) => !reviewedClassSet.has(classification),
			),
		);
		if (Object.keys(reviewRequiredScope).length) {
			steps.push({
				id: "missing_sales_scope_decision",
				title: "Decide non-active missing-sales scope",
				status: "product_decision_required",
				entrypoint: "inventory cutover scope decision",
				purpose:
					"Decide whether quote, terminal/history, completed-production, manual-prompt, and unknown-status rows belong in cutover evidence before any broad cursor backfill is run.",
				safety:
					"Do not run broad cursor backfill as a default repair. Treat this payload as review context only until the non-active buckets are explicitly included or excluded.",
				payloadBatches: [
					{
						reviewRequiredScope,
						broadCursorPayloadIfApproved: {
							cursorId: input.monitor.backfillCursorId ?? 0,
							batchSize: 50,
							includeAlreadySynced: false,
							source: "repair",
							scopeSummary: input.missingSalesScope.byClass,
						},
					},
				],
			});
		}
	}

	if (
		input.shipmentAllocation.driftCount > 0 ||
		input.shipmentAllocation.skippedCount > 0
	) {
		steps.push({
			id: "shipment_allocation_review",
			title: "Classify shipment/allocation mismatches",
			status: "review_required",
			entrypoint: "inventory:reconciliation-evidence shipmentAllocation",
			purpose:
				"Review the named shipment/allocation mismatch classes before choosing whether legacy delivery rows, consumed allocations, or line links are the source of truth for each row.",
			safety:
				"Read-only evidence only. Do not apply allocation or delivery repairs until each row is reviewed against operator shipment truth.",
			payloadBatches: [
				{
					status: input.shipmentAllocation.status,
					byClass: input.shipmentAllocation.byClass,
					samples: input.shipmentAllocation.samples.map((sample: any) => ({
						classification: sample.classification,
						orderId: sample.orderId,
						lineItemId: sample.lineItemId,
						salesItemId: sample.salesItemId,
						delta: sample.delta,
					})),
				},
			],
		});
	}

	if (
		input.reconciliation.totalDriftCount > 0 ||
		input.reconciliation.skippedComparisonCount > 0
	) {
		steps.push({
			id: "post_repair_reconciliation",
			title: "Rerun reconciliation evidence after reviewed repairs",
			status: "pending_prior_steps",
			entrypoint: "bun run inventory:reconciliation-evidence",
			purpose:
				"Confirm whether stale cleanup, component regeneration, and bounded backfill removed drift and skipped comparisons.",
			safety:
				"Treat the gate as closed only when monitor and reconciliation are synced, drift is zero, skipped comparisons are zero, and hasMore is false.",
			payloadBatches: [
				{
					command:
						"bun --env-file=.env.local run inventory:reconciliation-evidence --markdown",
				},
			],
		});
	}

	return {
		status: steps.length ? "review_required" : "no_repair_candidates",
		mutatesData: false,
		reviewRequired: steps.length > 0,
		rerunCommand:
			"bun --env-file=.env.local run inventory:reconciliation-evidence --markdown",
		steps,
	};
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;

	const [{ db }, monitorModule, reconciliationModule] = await Promise.all([
		import("../packages/db/src/index.ts"),
		import("../packages/sales/src/sales-inventory-sync-monitor.ts"),
		import("../packages/sales/src/inventory-reconciliation-report.ts"),
	]);

	try {
		const [
			monitor,
			reconciliation,
			staleCleanupPreview,
			missingSalesScope,
			shipmentAllocation,
		] = await Promise.all([
			monitorModule.getSalesInventorySyncMonitor(db, {
				sampleLimit: options.sampleLimit,
				includeReconciliation: true,
				reconciliationLimit: options.limit,
			}),
			reconciliationModule.getInventoryReconciliationReport(db, {
				limit: options.limit,
				sampleLimit: options.sampleLimit,
			}),
			monitorModule.cleanupStaleSalesInventoryLineItems(db, {
				dryRun: true,
				limit: 50,
			}),
			buildMissingSalesScopeClassification(db, {
				sampleLimit: options.sampleLimit,
			}),
			buildShipmentAllocationClassification(db, {
				limit: options.limit,
				sampleLimit: options.sampleLimit,
			}),
		]);

		const componentlessRows = await db.lineItem.findMany({
			where: {
				deletedAt: null,
				lineItemType: "SALE",
				sale: {
					is: {
						deletedAt: null,
					},
				},
				components: {
					none: {},
				},
			},
			orderBy: {
				id: "asc",
			},
			take: Math.max(options.sampleLimit, 1),
			select: {
				id: true,
				title: true,
				meta: true,
				salesItemId: true,
				salesItem: {
					select: {
						id: true,
						description: true,
						dykeDescription: true,
						meta: true,
						qty: true,
						rate: true,
						total: true,
						dykeProduction: true,
						formSteps: {
							where: {
								deletedAt: null,
							},
							select: {
								prodUid: true,
								value: true,
								qty: true,
								price: true,
								basePrice: true,
								meta: true,
								step: {
									select: {
										uid: true,
										title: true,
									},
								},
								component: {
									select: {
										uid: true,
										name: true,
									},
								},
							},
						},
						shelfItems: {
							where: {
								deletedAt: null,
							},
							select: {
								id: true,
								productId: true,
								categoryId: true,
								description: true,
								qty: true,
								unitPrice: true,
								totalPrice: true,
								meta: true,
								shelfProduct: {
									select: {
										id: true,
										title: true,
									},
								},
								category: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						housePackageTool: {
							select: {
								deletedAt: true,
								totalDoors: true,
								height: true,
								doorType: true,
								meta: true,
								stepProduct: {
									select: {
										uid: true,
										name: true,
										step: {
											select: {
												uid: true,
												title: true,
											},
										},
									},
								},
								doors: {
									where: {
										deletedAt: null,
									},
									select: {
										stepProductId: true,
										totalQty: true,
										dimension: true,
										meta: true,
										stepProduct: {
											select: {
												uid: true,
												name: true,
												step: {
													select: {
														uid: true,
														title: true,
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				sale: {
					select: {
						id: true,
						orderId: true,
					},
				},
			},
		});

		const componentlessAll = await db.lineItem.findMany({
			where: {
				deletedAt: null,
				lineItemType: "SALE",
				sale: {
					is: {
						deletedAt: null,
					},
				},
				components: {
					none: {},
				},
			},
			select: {
				id: true,
				title: true,
				meta: true,
				salesItemId: true,
				salesItem: {
					select: {
						id: true,
						description: true,
						dykeDescription: true,
						meta: true,
						qty: true,
						rate: true,
						total: true,
						dykeProduction: true,
						formSteps: {
							where: {
								deletedAt: null,
							},
							select: {
								prodUid: true,
								value: true,
								qty: true,
								price: true,
								basePrice: true,
								meta: true,
								step: {
									select: {
										uid: true,
										title: true,
									},
								},
								component: {
									select: {
										uid: true,
										name: true,
									},
								},
							},
						},
						shelfItems: {
							where: {
								deletedAt: null,
							},
							select: {
								id: true,
								productId: true,
								categoryId: true,
								description: true,
								qty: true,
								unitPrice: true,
								totalPrice: true,
								meta: true,
								shelfProduct: {
									select: {
										id: true,
										title: true,
									},
								},
								category: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						housePackageTool: {
							select: {
								deletedAt: true,
								totalDoors: true,
								height: true,
								doorType: true,
								meta: true,
								stepProduct: {
									select: {
										uid: true,
										name: true,
										step: {
											select: {
												uid: true,
												title: true,
											},
										},
									},
								},
								doors: {
									where: {
										deletedAt: null,
									},
									select: {
										stepProductId: true,
										totalQty: true,
										dimension: true,
										meta: true,
										stepProduct: {
											select: {
												uid: true,
												name: true,
												step: {
													select: {
														uid: true,
														title: true,
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				sale: {
					select: {
						id: true,
						orderId: true,
					},
				},
			},
			take: 500,
		});

		const bySource: Record<string, number> = {};
		const byOrder: Record<string, number> = {};
		const zeroComponentByReason: Record<string, number> = {};
		const zeroComponentSamples: Array<Record<string, unknown>> = [];
		const componentlessSalesOrderIds = new Set<number>();
		const zeroComponentSalesOrderIds = new Set<number>();
		for (const row of componentlessAll) {
			const source = inventorySyncSource(row.meta);
			const recordedComponentCount = inventorySyncComponentCount(row.meta);
			bySource[source] = (bySource[source] || 0) + 1;
			const orderId = row.sale?.orderId || "unknown";
			byOrder[orderId] = (byOrder[orderId] || 0) + 1;
			if (Number.isInteger(row.sale?.id)) {
				if (recordedComponentCount === 0) {
					zeroComponentSalesOrderIds.add(row.sale.id);
					const classification = classifyZeroComponentLine(row);
					addCount(zeroComponentByReason, classification.reason);
					if (zeroComponentSamples.length < options.sampleLimit) {
						zeroComponentSamples.push({
							lineItemId: row.id,
							salesOrderId: row.sale.id,
							orderId: row.sale?.orderId ?? null,
							salesItemId: row.salesItemId,
							title: row.title,
							source,
							recordedComponentCount,
							...classification,
						});
					}
				} else {
					componentlessSalesOrderIds.add(row.sale.id);
				}
			}
		}

		const staleLineItemIds = staleCleanupPreview.lineItemIds;
		const repairComponentlessSalesOrderIds = Array.from(
			componentlessSalesOrderIds,
		).sort((a, b) => a - b);
		const reviewZeroComponentSalesOrderIds = Array.from(
			zeroComponentSalesOrderIds,
		).sort((a, b) => a - b);
		const repairPlan = buildRepairPlan({
			monitor,
			reconciliation,
			missingSalesScope,
			shipmentAllocation,
			staleLineItemIds,
			componentlessSalesOrderIds: repairComponentlessSalesOrderIds,
			zeroComponentSalesOrderIds: reviewZeroComponentSalesOrderIds,
		});

		const payload = {
			generatedAt: new Date().toISOString(),
			databaseUrl: redactDatabaseUrl(process.env.DATABASE_URL),
			input: {
				limit: options.limit,
				sampleLimit: options.sampleLimit,
			},
			monitor: {
				status: monitor.status,
				syncCoverageRate: monitor.syncCoverageRate,
				backfillCursorId: monitor.backfillCursorId,
				skippedAlreadySyncedCount: monitor.skippedAlreadySyncedCount,
				failedRiskCount: monitor.failedRiskCount,
				totalSalesCount: monitor.totalSalesCount,
				syncedSalesCount: monitor.syncedSalesCount,
				missingSalesCount: monitor.missingSalesCount,
				inventoryLineItemCount: monitor.inventoryLineItemCount,
				componentCount: monitor.componentCount,
				requiredComponentCount: monitor.requiredComponentCount,
				componentlessLineItemCount: monitor.componentlessLineItemCount,
				componentlessSalesCount: monitor.componentlessSalesCount,
				pendingReviewComponentCount: monitor.pendingReviewComponentCount,
				awaitingInboundComponentCount: monitor.awaitingInboundComponentCount,
				allocatedComponentCount: monitor.allocatedComponentCount,
				fulfilledComponentCount: monitor.fulfilledComponentCount,
				staleInventoryLineItemCount: monitor.staleInventoryLineItemCount,
				staleStockAllocationCount: monitor.staleStockAllocationCount,
				staleInboundDemandCount: monitor.staleInboundDemandCount,
				nextUnsyncedSalesOrderId: monitor.nextUnsyncedSalesOrderId,
				missingSamples: monitor.missingSamples,
				reviewSamples: monitor.reviewSamples,
				staleSamples: monitor.staleSamples,
			},
			missingSalesScope,
			reconciliation: {
				status: reconciliation.status,
				checkedLineCount: reconciliation.checkedLineCount,
				totalDriftCount: reconciliation.totalDriftCount,
				skippedComparisonCount: reconciliation.skippedComparisonCount,
				nextCursorId: reconciliation.nextCursorId,
				hasMore: reconciliation.hasMore,
				domainSummaries: Object.values(reconciliation.domains).map((domain) => ({
					domain: domain.domain,
					checkedCount: domain.checkedCount,
					driftCount: domain.driftCount,
					severity: domain.severity,
					skippedCount: domain.skippedCount,
					skippedReasons: domain.skippedReasons,
					sampleCount: domain.samples.length,
					samples: domain.samples,
				})),
			},
			shipmentAllocation,
			staleCleanupPreview,
			componentless: {
				total: monitor.componentlessLineItemCount,
				bySource,
				topOrders: Object.entries(byOrder)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10),
				zeroComponentSalesOrderIds: reviewZeroComponentSalesOrderIds,
				zeroComponentByReason,
				zeroComponentSamples,
				samples: componentlessRows.map((row) => ({
					lineItemId: row.id,
					orderId: row.sale?.orderId ?? null,
					salesOrderId: row.sale?.id ?? null,
					salesItemId: row.salesItemId,
					source: inventorySyncSource(row.meta),
					recordedComponentCount: inventorySyncComponentCount(row.meta),
					zeroComponentClassification:
						inventorySyncComponentCount(row.meta) === 0
							? classifyZeroComponentLine(row)
							: null,
					title: row.title,
				})),
			},
			repairCandidates: {
				componentlessSalesOrderIds: repairComponentlessSalesOrderIds,
				zeroComponentSalesOrderIds: reviewZeroComponentSalesOrderIds,
				staleLineItemIds,
			},
			repairPlan,
		};

		if (options.json) {
			console.log(JSON.stringify(payload, null, 2));
			return;
		}

		console.log(renderMarkdown(payload));
	} finally {
		await db.$disconnect();
	}
}

main().catch((error) => {
	if (error instanceof UsageError) {
		console.error(error.message);
		usage();
		process.exit(1);
	}
	console.error(error);
	process.exit(1);
});
