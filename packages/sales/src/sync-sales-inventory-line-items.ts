import type { Db, TransactionClient } from "@gnd/db";
import { resolveOrderInboundDemandStatus } from "@gnd/inventory/inbound";
import { generateInventoryCategoryUidFromShelfCategoryId } from "@gnd/inventory/inventory-utils";

type DbLike = Db | TransactionClient;
const ACTIVE_STOCK_ALLOCATION_STATUSES = [
	"pending_review",
	"approved",
	"reserved",
	"picked",
] as const;

export const resolveProjectedInboundDemandStatus =
	resolveOrderInboundDemandStatus;

export type SyncSalesInventoryLineItemsInput = {
	salesOrderId: number;
	source?: "new-form" | "old-form" | "copy-sales" | "manual" | "repair";
	triggeredByUserId?: number | null;
};

export type SyncSalesInventoryLineItemsResult = {
	salesOrderId: number;
	createdCount: number;
	updatedCount: number;
	deletedCount: number;
	skippedCount: number;
	warnings: string[];
};

type InventoryMapping = {
	inventoryId: number;
	inventoryVariantId: number;
	inventoryCategoryId: number;
};

type ResolvedInventoryMapping = InventoryMapping & {
	inventoryUid: string | null;
};

type ComponentLinePricingSnapshot = {
	costPrice: number | null;
	salesPrice: number | null;
	unitCostPrice: number | null;
	unitSalesPrice: number | null;
	qty: number;
	inventoryId: number;
	inventoryVariantId: number;
};

type SyncComponentCandidate = {
	sourceType:
		| "dyke-step-product"
		| "dyke-house-package"
		| "dyke-door-product"
		| "shelf-product";
	sourceUid: string;
	title: string;
	qty: number;
	required: boolean;
	inventoryUid: string;
	variantUid: string;
	inventoryCategoryUid: string;
	inventoryCategoryTitle: string;
	inventoryName: string;
	unitCostPrice?: number | null;
	unitSalesPrice?: number | null;
};

type SyncItemLike = {
	id: number;
	description: string | null;
	qty?: number | null;
	rate?: number | null;
	total?: number | null;
	dykeProduction?: boolean | null;
	meta: unknown;
	formSteps: Array<{
		prodUid: string | null;
		value?: string | null;
		qty: number | null;
		price?: number | null;
		basePrice?: number | null;
		meta: unknown;
		step: { uid: string | null; title: string | null } | null;
		component: { uid: string | null; name: string | null } | null;
	}>;
	shelfItems: Array<{
		productId: number | null;
		qty: number | null;
		description: string | null;
		categoryId: number | null;
		unitPrice?: number | null;
		totalPrice?: number | null;
		meta?: unknown;
		shelfProduct: { id: number; title: string | null } | null;
		category: { id: number; name: string | null } | null;
	}>;
	housePackageTool: {
		deletedAt: Date | null;
		totalDoors: number | null;
		dimension?: string | null;
		dependenciesUid?: string | null;
		meta?: unknown;
		stepProduct: {
			uid: string | null;
			name: string | null;
			step: { uid: string | null; title: string | null } | null;
		} | null;
		doors?: Array<{
			totalQty: number | null;
			dimension?: string | null;
			meta?: unknown;
			dependenciesUid?: string | null;
			unitPrice?: number | null;
			lineTotal?: number | null;
			stepProduct: {
				uid: string | null;
				name: string | null;
				step: { uid: string | null; title: string | null } | null;
			} | null;
		}>;
	} | null;
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function metadataArray(value: unknown) {
	return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown): number | null {
	const num = Number(value);
	return Number.isFinite(num) && num > 0 ? num : null;
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | null {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return true;
		if (normalized === "false") return false;
	}
	return null;
}

function asPositiveNumber(value: unknown, fallback = 1): number {
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0) return fallback;
	return num;
}

function numberSafeDivide(total: unknown, divisor: unknown) {
	const totalNumber = Number(total);
	const divisorNumber = Number(divisor);
	if (!Number.isFinite(totalNumber) || !Number.isFinite(divisorNumber)) {
		return null;
	}
	if (divisorNumber <= 0) return null;
	return totalNumber / divisorNumber;
}

function roundCurrencySnapshotValue(value: number | null) {
	if (value == null) return null;
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function firstFiniteNumber(...values: Array<unknown>) {
	for (const value of values) {
		if (value == null || value === "") continue;
		const num = Number(value);
		if (Number.isFinite(num)) return num;
	}
	return null;
}

function firstPositiveNumber(...values: Array<unknown>) {
	for (const value of values) {
		if (value == null || value === "") continue;
		const num = Number(value);
		if (Number.isFinite(num) && num > 0) return num;
	}
	return null;
}

function profileCoefficientValue(value?: number | null) {
	const coefficient = Number(value || 0);
	return Number.isFinite(coefficient) && coefficient > 0 ? coefficient : null;
}

function completeUnitPricingFromProfile(input: {
	unitCostPrice?: number | null;
	unitSalesPrice?: number | null;
	profileCoefficient?: number | null;
}) {
	const coefficient = profileCoefficientValue(input.profileCoefficient);
	let unitCostPrice = firstPositiveNumber(input.unitCostPrice);
	let unitSalesPrice = firstPositiveNumber(input.unitSalesPrice);

	if (unitCostPrice == null && unitSalesPrice != null && coefficient != null) {
		unitCostPrice = unitSalesPrice * coefficient;
	}

	if (unitSalesPrice == null && unitCostPrice != null) {
		unitSalesPrice =
			coefficient == null ? unitCostPrice : unitCostPrice / coefficient;
	}

	return {
		unitCostPrice: roundCurrencySnapshotValue(unitCostPrice),
		unitSalesPrice: roundCurrencySnapshotValue(unitSalesPrice),
	};
}

function resolveCandidateLinePricingSnapshot(
	candidate: SyncComponentCandidate,
	input: InventoryMapping & { qty: number },
): ComponentLinePricingSnapshot | null {
	const unitCostPrice = firstFiniteNumber(candidate.unitCostPrice);
	const unitSalesPrice = firstFiniteNumber(candidate.unitSalesPrice);

	if (unitCostPrice == null && unitSalesPrice == null) return null;

	return {
		costPrice: roundCurrencySnapshotValue(
			unitCostPrice == null ? null : unitCostPrice * input.qty,
		),
		salesPrice: roundCurrencySnapshotValue(
			unitSalesPrice == null ? null : unitSalesPrice * input.qty,
		),
		unitCostPrice: roundCurrencySnapshotValue(unitCostPrice),
		unitSalesPrice: roundCurrencySnapshotValue(unitSalesPrice),
		qty: input.qty,
		inventoryId: input.inventoryId,
		inventoryVariantId: input.inventoryVariantId,
	};
}

function mergeComponentLinePricingSnapshots(
	primary: ComponentLinePricingSnapshot | null,
	fallback: ComponentLinePricingSnapshot | null,
	input: InventoryMapping & { qty: number },
): ComponentLinePricingSnapshot | null {
	const unitCostPrice =
		primary?.unitCostPrice ?? fallback?.unitCostPrice ?? null;
	const unitSalesPrice =
		primary?.unitSalesPrice ?? fallback?.unitSalesPrice ?? null;

	if (unitCostPrice == null && unitSalesPrice == null) return null;

	return {
		costPrice: roundCurrencySnapshotValue(
			primary?.costPrice ??
				fallback?.costPrice ??
				(unitCostPrice == null ? null : unitCostPrice * input.qty),
		),
		salesPrice: roundCurrencySnapshotValue(
			primary?.salesPrice ??
				fallback?.salesPrice ??
				(unitSalesPrice == null ? null : unitSalesPrice * input.qty),
		),
		unitCostPrice: roundCurrencySnapshotValue(unitCostPrice),
		unitSalesPrice: roundCurrencySnapshotValue(unitSalesPrice),
		qty: input.qty,
		inventoryId: input.inventoryId,
		inventoryVariantId: input.inventoryVariantId,
	};
}

async function resolveComponentLinePricingSnapshot(
	db: DbLike,
	input: InventoryMapping & { qty: number },
): Promise<ComponentLinePricingSnapshot | null> {
	const variant = await db.inventoryVariant.findUnique({
		where: {
			id: input.inventoryVariantId,
		},
		select: {
			pricing: {
				select: {
					costPrice: true,
					price: true,
				},
			},
			supplierVariants: {
				where: {
					active: true,
					deletedAt: null,
				},
				orderBy: [
					{
						preferred: "desc",
					},
					{
						id: "asc",
					},
				],
				select: {
					costPrice: true,
					salesPrice: true,
				},
			},
		},
	});

	const preferredSupplierVariant = variant?.supplierVariants?.[0] ?? null;
	const unitCostPrice = firstFiniteNumber(
		variant?.pricing?.costPrice,
		preferredSupplierVariant?.costPrice,
	);
	const unitSalesPrice = firstFiniteNumber(
		variant?.pricing?.price,
		preferredSupplierVariant?.salesPrice,
	);

	if (unitCostPrice == null && unitSalesPrice == null) return null;

	return {
		costPrice: roundCurrencySnapshotValue(
			unitCostPrice == null ? null : unitCostPrice * input.qty,
		),
		salesPrice: roundCurrencySnapshotValue(
			unitSalesPrice == null ? null : unitSalesPrice * input.qty,
		),
		unitCostPrice: roundCurrencySnapshotValue(unitCostPrice),
		unitSalesPrice: roundCurrencySnapshotValue(unitSalesPrice),
		qty: input.qty,
		inventoryId: input.inventoryId,
		inventoryVariantId: input.inventoryVariantId,
	};
}

function sumDoorQty(
	doors:
		| Array<{
				totalQty: number | null;
		  }>
		| undefined,
) {
	return (doors || []).reduce(
		(total, door) => total + asPositiveNumber(door.totalQty, 0),
		0,
	);
}

function housePackageDoorQty(
	housePackageTool: SyncItemLike["housePackageTool"],
) {
	if (!housePackageTool || housePackageTool.deletedAt) return 0;
	return asPositiveNumber(
		housePackageTool.totalDoors,
		sumDoorQty(housePackageTool.doors),
	);
}

function makeSourceKey(
	sourceType: SyncComponentCandidate["sourceType"],
	sourceUid: string,
	variantUid = sourceUid,
) {
	return `${sourceType}:${sourceUid}:${variantUid}`;
}

function makeCandidateKey(candidate: SyncComponentCandidate) {
	return makeSourceKey(
		candidate.sourceType,
		candidate.sourceUid,
		candidate.variantUid,
	);
}

function normalizeDykeDependencyUid(value: unknown): string | null {
	const raw = readString(value);
	if (!raw) return null;

	const supplierSeparatorIndex = raw.indexOf(" & ");
	const dependency =
		supplierSeparatorIndex > 0 ? raw.slice(0, supplierSeparatorIndex) : raw;
	const doorSizeMatch = dependency.match(/^(\d+-\d+)\s*x\s*(\d+-\d+)$/i);
	if (!doorSizeMatch) return dependency.trim() || null;

	const [, width, height] = doorSizeMatch;
	return `w${width.replace(/-/g, "_")}-h${height.replace(/-/g, "_")}`;
}

function readDependencyUidFromParts(value: unknown): string | null {
	if (!Array.isArray(value)) return null;

	const parts = value
		.map((part) => normalizeDykeDependencyUid(part))
		.filter((part): part is string => Boolean(part));

	return parts.length ? parts.join("-") : null;
}

function readDependencyUidFromRecord(
	record: Record<string, unknown>,
): string | null {
	const nestedMeta = asRecord(record._metaData);
	const nestedInventory = asRecord(record.inventory);
	const direct =
		normalizeDykeDependencyUid(record.dependenciesUid) ??
		normalizeDykeDependencyUid(record.pricingDependencyUid) ??
		normalizeDykeDependencyUid(record.dependencyUid) ??
		normalizeDykeDependencyUid(record.inventoryVariantUid) ??
		normalizeDykeDependencyUid(nestedMeta.dependenciesUid) ??
		normalizeDykeDependencyUid(nestedMeta.pricingDependencyUid) ??
		normalizeDykeDependencyUid(nestedInventory.variantUid) ??
		normalizeDykeDependencyUid(nestedInventory.inventoryVariantUid);

	return direct ?? readDependencyUidFromParts(record.dependenciesUidParts);
}

type StepSelectionContext = {
	selectedByStepUid: Record<string, string>;
	selectedProdUidsByStepUid: Record<string, string[]>;
};

function buildStepSelectionContext(
	formSteps: SyncItemLike["formSteps"],
): StepSelectionContext {
	const selectedByStepUid: Record<string, string> = {};
	const selectedProdUidsByStepUid: Record<string, string[]> = {};

	for (const step of formSteps) {
		const stepUid = readString(step.step?.uid);
		if (!stepUid) continue;

		const stepMeta = asRecord(step.meta);
		const selectedUids = metadataArray(stepMeta.selectedProdUids)
			.map((uid) => readString(uid))
			.filter((uid): uid is string => Boolean(uid));
		const selectedComponentUids = metadataArray(stepMeta.selectedComponents)
			.map((component) => readString(asRecord(component).uid))
			.filter((uid): uid is string => Boolean(uid));
		const allUids = Array.from(
			new Set(
				[
					...selectedUids,
					...selectedComponentUids,
					readString(step.prodUid),
					readString(step.component?.uid),
				].filter((uid): uid is string => Boolean(uid)),
			),
		);

		if (allUids.length) {
			selectedProdUidsByStepUid[stepUid] = allUids;
			selectedByStepUid[stepUid] = allUids[0] as string;
		}
	}

	return {
		selectedByStepUid,
		selectedProdUidsByStepUid,
	};
}

function permutations(values: string[]) {
	if (values.length <= 1) return [values];
	if (values.length > 4) return [values];

	const out: string[][] = [];
	const used = new Array(values.length).fill(false);
	const path: string[] = [];
	const walk = () => {
		if (path.length === values.length) {
			out.push([...path]);
			return;
		}
		for (let index = 0; index < values.length; index++) {
			if (used[index]) continue;
			used[index] = true;
			path.push(values[index] as string);
			walk();
			path.pop();
			used[index] = false;
		}
	};
	walk();
	return out;
}

function cartesian(groups: string[][], max = 24) {
	if (!groups.length) return [] as string[][];

	let acc: string[][] = [[]];
	for (const group of groups) {
		const next: string[][] = [];
		for (const prefix of acc) {
			for (const value of group) {
				next.push([...prefix, value]);
				if (next.length >= max) return next;
			}
		}
		acc = next;
		if (acc.length >= max) return acc.slice(0, max);
	}

	return acc;
}

function dependencyKeyCandidatesFromStep(
	priceStepDeps: unknown,
	context?: StepSelectionContext,
) {
	if (!Array.isArray(priceStepDeps) || !context) return [];

	const depValueGroups = priceStepDeps
		.map((stepUid) => {
			const normalizedStepUid = readString(stepUid);
			if (!normalizedStepUid) return [];
			const selectedAll =
				context.selectedProdUidsByStepUid[normalizedStepUid] || [];
			if (selectedAll.length) return Array.from(new Set(selectedAll));
			const selected = context.selectedByStepUid[normalizedStepUid];
			return selected ? [selected] : [];
		})
		.filter((group) => group.length);

	return Array.from(
		new Set(
			cartesian(depValueGroups).flatMap((combo) => [
				combo.join("-"),
				...permutations(combo).map((values) => values.join("-")),
			]),
		),
	).filter(Boolean);
}

function dependencyUidFromPricingObject(
	pricing: unknown,
	priceStepDeps: unknown,
	context?: StepSelectionContext,
) {
	const pricingRecord = asRecord(pricing);
	if (!Object.keys(pricingRecord).length) return null;

	const keyCandidates = dependencyKeyCandidatesFromStep(priceStepDeps, context);
	for (const key of keyCandidates) {
		if (pricingRecord[key] != null) return normalizeDykeDependencyUid(key);
	}

	return null;
}

function selectedComponentForStep(
	stepMeta: Record<string, unknown>,
	sourceUid: string,
) {
	const selectedComponents = metadataArray(stepMeta.selectedComponents).map(
		(component) => asRecord(component),
	);
	return (
		selectedComponents.find(
			(component) => readString(component.uid) === sourceUid,
		) ??
		selectedComponents[0] ??
		{}
	);
}

function resolveCandidateVariantUid(input: {
	sourceUid: string;
	stepMeta?: Record<string, unknown>;
	selectedComponent?: Record<string, unknown>;
	context?: StepSelectionContext;
}) {
	const selectedComponent = input.selectedComponent ?? {};
	const stepMeta = input.stepMeta ?? {};
	const selectedMeta = asRecord(selectedComponent._metaData);

	return (
		readDependencyUidFromRecord(selectedComponent) ??
		readDependencyUidFromRecord(selectedMeta) ??
		readDependencyUidFromRecord(stepMeta) ??
		dependencyUidFromPricingObject(
			selectedComponent.pricing,
			stepMeta.priceStepDeps,
			input.context,
		) ??
		input.sourceUid
	);
}

function extractInventoryMapping(meta: unknown): InventoryMapping | null {
	const root = asRecord(meta);
	const nestedMeta = asRecord(root.meta);
	const inventory = asRecord(root.inventory);
	const nestedInventory = asRecord(nestedMeta.inventory);

	const inventoryId =
		readNumber(root.inventoryId) ??
		readNumber(nestedMeta.inventoryId) ??
		readNumber(inventory.id) ??
		readNumber(nestedInventory.id);
	const inventoryVariantId =
		readNumber(root.inventoryVariantId) ??
		readNumber(nestedMeta.inventoryVariantId) ??
		readNumber(inventory.variantId) ??
		readNumber(inventory.inventoryVariantId) ??
		readNumber(nestedInventory.variantId) ??
		readNumber(nestedInventory.inventoryVariantId);
	const inventoryCategoryId =
		readNumber(root.inventoryCategoryId) ??
		readNumber(nestedMeta.inventoryCategoryId) ??
		readNumber(inventory.categoryId) ??
		readNumber(inventory.inventoryCategoryId) ??
		readNumber(nestedInventory.categoryId) ??
		readNumber(nestedInventory.inventoryCategoryId);

	if (!inventoryId || !inventoryVariantId || !inventoryCategoryId) {
		return null;
	}

	return {
		inventoryId,
		inventoryVariantId,
		inventoryCategoryId,
	};
}

async function ensureInventoryCategory(
	db: DbLike,
	input: {
		uid: string;
		title: string;
		type: string;
	},
) {
	const existing = await db.inventoryCategory.findFirst({
		where: {
			uid: input.uid,
			deletedAt: null,
		},
		select: {
			id: true,
			title: true,
			uid: true,
		},
	});

	if (existing) return existing;

	return db.inventoryCategory.create({
		data: {
			uid: input.uid,
			title: input.title,
			type: input.type,
		},
		select: {
			id: true,
			title: true,
			uid: true,
		},
	});
}

async function ensureInventoryRecord(
	db: DbLike,
	input: {
		uid: string;
		name: string;
		inventoryCategoryId: number;
	},
) {
	const existing = await db.inventory.findFirst({
		where: {
			uid: input.uid,
			deletedAt: null,
		},
		select: {
			id: true,
			uid: true,
			name: true,
			inventoryCategoryId: true,
		},
	});

	if (existing) {
		const shouldRepairName =
			input.name &&
			input.name !== input.uid &&
			(!existing.name || existing.name === existing.uid);
		if (!shouldRepairName) return existing;

		return db.inventory.update({
			where: {
				id: existing.id,
			},
			data: {
				name: input.name,
			},
			select: {
				id: true,
				uid: true,
				name: true,
				inventoryCategoryId: true,
			},
		});
	}

	return db.inventory.create({
		data: {
			uid: input.uid,
			name: input.name,
			inventoryCategoryId: input.inventoryCategoryId,
		},
		select: {
			id: true,
			uid: true,
			name: true,
			inventoryCategoryId: true,
		},
	});
}

async function ensureInventoryVariantRecord(
	db: DbLike,
	input: {
		inventoryId: number;
		uid: string;
	},
) {
	const existing = await db.inventoryVariant.findFirst({
		where: {
			inventoryId: input.inventoryId,
			uid: input.uid,
		},
		select: {
			id: true,
			uid: true,
		},
	});

	if (existing) return existing;

	return db.inventoryVariant.create({
		data: {
			inventoryId: input.inventoryId,
			uid: input.uid,
		},
		select: {
			id: true,
			uid: true,
		},
	});
}

async function ensureInventoryMappingFromCandidate(
	db: DbLike,
	candidate: SyncComponentCandidate,
) {
	const categoryType =
		candidate.sourceType === "shelf-product" ? "shelf-item" : "component";

	const category = await ensureInventoryCategory(db, {
		uid: candidate.inventoryCategoryUid,
		title: candidate.inventoryCategoryTitle,
		type: categoryType,
	});

	const inventory = await ensureInventoryRecord(db, {
		uid: candidate.inventoryUid,
		name: candidate.inventoryName,
		inventoryCategoryId: category.id,
	});

	const variant = await ensureInventoryVariantRecord(db, {
		inventoryId: inventory.id,
		uid: candidate.variantUid,
	});

	return {
		inventoryId: inventory.id,
		inventoryVariantId: variant.id,
		inventoryCategoryId: category.id,
		inventoryUid: inventory.uid,
	} satisfies ResolvedInventoryMapping;
}

async function resolveInventoryMappingForItem(
	db: DbLike,
	item: SyncItemLike,
): Promise<ResolvedInventoryMapping | null> {
	const explicitMapping = extractInventoryMapping(item.meta);
	if (explicitMapping) {
		const inventory = await db.inventory.findFirst({
			where: {
				id: explicitMapping.inventoryId,
			},
			select: {
				uid: true,
			},
		});

		return {
			...explicitMapping,
			inventoryUid: inventory?.uid ?? null,
		};
	}

	const housePackageTool =
		item.housePackageTool && !item.housePackageTool.deletedAt
			? item.housePackageTool
			: metadataHousePackageTool(item);
	const hptStepProduct = housePackageTool?.stepProduct;
	if (hptStepProduct?.uid && hptStepProduct.step?.uid) {
		const hptCandidate = buildHousePackageCandidate(
			housePackageTool,
			item.qty,
			firstFiniteNumber(item.rate, numberSafeDivide(item.total, item.qty)),
		);
		if (hptCandidate) {
			return ensureInventoryMappingFromCandidate(db, hptCandidate);
		}
	}

	const shelfItems = item.shelfItems.length
		? item.shelfItems
		: metadataShelfItems(item);
	if (shelfItems.length === 1) {
		const shelf = shelfItems[0];
		if (shelf?.productId && shelf.categoryId) {
			const uid = `shelf-prod-${shelf.productId}`;
			return ensureInventoryMappingFromCandidate(db, {
				sourceType: "shelf-product",
				sourceUid: uid,
				title:
					shelf.shelfProduct?.title ||
					shelf.description ||
					item.description ||
					`Shelf Item ${shelf.productId}`,
				qty: asPositiveNumber(shelf.qty, 1),
				required: true,
				inventoryUid: uid,
				variantUid: uid,
				inventoryCategoryUid: generateInventoryCategoryUidFromShelfCategoryId(
					shelf.categoryId,
				),
				inventoryCategoryTitle: shelf.category?.name || "Shelf Item",
				inventoryName:
					shelf.shelfProduct?.title ||
					shelf.description ||
					item.description ||
					`Shelf Item ${shelf.productId}`,
			});
		}
	}

	const formSteps = item.formSteps.length
		? item.formSteps
		: metadataFormSteps(item);
	if (formSteps.length === 1) {
		const step = formSteps[0];
		if (step) {
			const stepCandidate = buildStepFormCandidate(
				step,
				1,
				buildStepSelectionContext(formSteps),
			);
			if (stepCandidate) {
				return ensureInventoryMappingFromCandidate(db, {
					...stepCandidate,
					title:
						stepCandidate.title || item.description || `Sales Item ${item.id}`,
					inventoryName:
						stepCandidate.inventoryName ||
						item.description ||
						`Sales Item ${item.id}`,
				});
			}
		}
	}

	return null;
}

function componentSnapshotById(itemMeta: Record<string, unknown>) {
	const byId = new Map<
		number,
		{
			uid: string;
			title: string | null;
			stepUid: string | null;
			stepTitle: string | null;
		}
	>();

	for (const rawStep of metadataArray(itemMeta.formSteps)) {
		const step = asRecord(rawStep);
		const stepMeta = asRecord(step.meta);
		const stepRecord = asRecord(step.step);
		const stepUid = readString(stepRecord.uid);
		const stepTitle = readString(stepRecord.title);
		const snapshots = metadataArray(stepMeta.selectedComponents);
		for (const rawComponent of snapshots) {
			const component = asRecord(rawComponent);
			const id = readNumber(component.id);
			const uid = readString(component.uid);
			if (!id || !uid) continue;
			byId.set(id, {
				uid,
				title: readString(component.title),
				stepUid,
				stepTitle,
			});
		}
	}

	return byId;
}

function metadataFormSteps(item: SyncItemLike) {
	const itemMeta = asRecord(item.meta);
	return metadataArray(itemMeta.formSteps).map((rawStep) => {
		const step = asRecord(rawStep);
		const stepRecord = asRecord(step.step);
		const stepMeta = asRecord(step.meta);
		const component = asRecord(step.component);
		const selectedComponent = asRecord(
			metadataArray(stepMeta.selectedComponents)[0],
		);
		return {
			prodUid: readString(step.prodUid),
			value: readString(step.value),
			qty: readNumber(step.qty),
			price: firstFiniteNumber(step.price),
			basePrice: firstFiniteNumber(step.basePrice),
			meta: step.meta,
			step: {
				uid: readString(stepRecord.uid),
				title: readString(stepRecord.title),
			},
			component: {
				uid: readString(component.uid) ?? readString(selectedComponent.uid),
				name:
					readString(component.name) ??
					readString(selectedComponent.title) ??
					readString(step.value),
			},
		};
	});
}

function metadataShelfItems(item: SyncItemLike) {
	const itemMeta = asRecord(item.meta);
	return metadataArray(itemMeta.shelfItems).map((rawShelf) => {
		const shelf = asRecord(rawShelf);
		const meta = asRecord(shelf.meta);
		const categoryId =
			readNumber(shelf.categoryId) ??
			readNumber(meta.shelfParentCategoryId) ??
			null;
		const productId =
			readNumber(shelf.productId) ?? readNumber(shelf.id) ?? null;
		return {
			productId,
			qty: readNumber(shelf.qty),
			description: readString(shelf.description),
			categoryId,
			unitPrice: firstFiniteNumber(shelf.unitPrice, meta.unitPrice),
			totalPrice: firstFiniteNumber(shelf.totalPrice, meta.totalPrice),
			meta: shelf.meta,
			shelfProduct: productId
				? {
						id: productId,
						title: readString(shelf.description),
					}
				: null,
			category: categoryId
				? {
						id: categoryId,
						name: readString(meta.categoryName) ?? "Shelf Item",
					}
				: null,
		};
	});
}

function metadataHousePackageTool(item: SyncItemLike) {
	const itemMeta = asRecord(item.meta);
	const hpt = asRecord(itemMeta.housePackageTool);
	if (!Object.keys(hpt).length) return null;

	const componentById = componentSnapshotById(itemMeta);
	const hptStepProduct = asRecord(hpt.stepProduct);
	const hptStep = asRecord(hptStepProduct.step);
	const doors = metadataArray(hpt.doors).map((rawDoor) => {
		const door = asRecord(rawDoor);
		const stepProductId = readNumber(door.stepProductId);
		const snapshot = stepProductId ? componentById.get(stepProductId) : null;
		const doorStepProduct = asRecord(door.stepProduct);
		const doorStep = asRecord(doorStepProduct.step);
		const uid = readString(doorStepProduct.uid) ?? snapshot?.uid ?? null;
		const title =
			readString(doorStepProduct.name) ??
			snapshot?.title ??
			readString(door.title) ??
			uid;
		const stepUid = readString(doorStep.uid) ?? snapshot?.stepUid ?? null;
		return {
			totalQty: readNumber(door.totalQty),
			dimension: readString(door.dimension),
			dependenciesUid: readString(door.dependenciesUid),
			unitPrice: firstFiniteNumber(door.unitPrice),
			lineTotal: firstFiniteNumber(door.lineTotal),
			meta: door.meta,
			stepProduct: uid
				? {
						uid,
						name: title,
						step: {
							uid: stepUid,
							title:
								readString(doorStep.title) ?? snapshot?.stepTitle ?? "Door",
						},
					}
				: null,
		};
	});

	const rootDoor = doors.find((door) => door.stepProduct?.uid) || null;
	const hptUid =
		readString(hptStepProduct.uid) ?? rootDoor?.stepProduct?.uid ?? null;
	const hptName =
		readString(hptStepProduct.name) ??
		rootDoor?.stepProduct?.name ??
		item.description ??
		hptUid;
	const hptStepUid =
		readString(hptStep.uid) ?? rootDoor?.stepProduct?.step?.uid ?? null;

	return {
		deletedAt: null,
		totalDoors: readNumber(hpt.totalDoors),
		dimension: readString(hpt.dimension),
		dependenciesUid: readString(hpt.dependenciesUid),
		meta: hpt.meta,
		stepProduct: hptUid
			? {
					uid: hptUid,
					name: hptName,
					step: {
						uid: hptStepUid,
						title:
							readString(hptStep.title) ??
							rootDoor?.stepProduct?.step?.title ??
							"Door",
					},
				}
			: null,
		doors,
	};
}

function isServiceSalesItem(item: SyncItemLike) {
	const formSteps = item.formSteps.length
		? item.formSteps
		: metadataFormSteps(item);
	return formSteps.some((step) => {
		const value = readString(step.value)?.toLowerCase();
		return value === "services" || value === "service";
	});
}

function isMouldingSalesItem(item: SyncItemLike) {
	const itemMeta = asRecord(item.meta);
	const nestedMeta = asRecord(itemMeta.meta);
	const textValues = [
		item.description,
		readString(itemMeta.title),
		readString(itemMeta.itemType),
		readString(itemMeta.kind),
		readString(nestedMeta.itemType),
		readString(nestedMeta.kind),
	]
		.filter((value): value is string => Boolean(value))
		.map((value) => value.toLowerCase());

	if (
		textValues.some(
			(value) => value.includes("moulding") || value.includes("molding"),
		)
	) {
		return true;
	}

	if (
		metadataArray(itemMeta.mouldingRows).length ||
		metadataArray(nestedMeta.mouldingRows).length
	) {
		return true;
	}

	const hpt =
		item.housePackageTool && !item.housePackageTool.deletedAt
			? item.housePackageTool
			: metadataHousePackageTool(item);
	return Boolean(
		hpt && Number(hpt.totalDoors || 0) <= 0 && hpt.stepProduct?.uid,
	);
}

export function resolveSalesItemProductionEligibility(item: SyncItemLike) {
	const itemMeta = asRecord(item.meta);
	const nestedMeta = asRecord(itemMeta.meta);
	const explicitProduceable =
		readBoolean(itemMeta.produceable) ??
		readBoolean(nestedMeta.produceable) ??
		readBoolean(itemMeta.production) ??
		readBoolean(nestedMeta.production);

	if (explicitProduceable !== null) return explicitProduceable;
	if (isMouldingSalesItem(item)) return false;
	if (isServiceSalesItem(item)) return item.dykeProduction === true;
	if (item.dykeProduction === true) return true;
	return true;
}

export function buildInventorySyncComponentCandidatesForItem(
	item: SyncItemLike,
	options: { profileCoefficient?: number | null } = {},
) {
	const candidates = new Map<string, SyncComponentCandidate>();
	const formSteps = item.formSteps.length
		? item.formSteps
		: metadataFormSteps(item);
	const shelfItems = item.shelfItems.length
		? item.shelfItems
		: metadataShelfItems(item);
	const housePackageTool =
		item.housePackageTool && !item.housePackageTool.deletedAt
			? item.housePackageTool
			: metadataHousePackageTool(item);
	const doorQty = housePackageDoorQty(housePackageTool);
	const stepSelectionContext = buildStepSelectionContext(formSteps);

	const addCandidate = (candidate: SyncComponentCandidate | null) => {
		if (!candidate) return;

		const key = makeCandidateKey(candidate);
		const existing = candidates.get(key);
		if (!existing) {
			candidates.set(key, candidate);
			return;
		}

		candidates.set(key, {
			...existing,
			qty: existing.qty + candidate.qty,
			required: existing.required || candidate.required,
		});
	};

	for (const step of formSteps) {
		addCandidate(
			buildStepFormCandidate(step, doorQty || 1, stepSelectionContext),
		);
	}

	for (const shelf of shelfItems) {
		addCandidate(buildShelfCandidate(shelf, options));
	}

	if (housePackageTool && !housePackageTool.deletedAt) {
		const doors = housePackageTool.doors || [];
		if (!doors.length) {
			addCandidate(
				buildHousePackageCandidate(
					housePackageTool,
					item.qty,
					firstFiniteNumber(item.rate, numberSafeDivide(item.total, item.qty)),
					options,
				),
			);
		}
		for (const door of doors) {
			addCandidate(buildDoorCandidate(door));
		}
	}

	return Array.from(candidates.values());
}

function normalizeItemTitle(item: {
	id: number;
	description: string | null;
	meta: unknown;
}) {
	const itemMeta = asRecord(item.meta);
	return (
		readString(itemMeta.title) ??
		readString(asRecord(itemMeta.meta).title) ??
		item.description ??
		`Sales Item ${item.id}`
	);
}

function normalizeItemDescription(item: {
	description: string | null;
	meta: unknown;
	housePackageTool?: SyncItemLike["housePackageTool"];
}) {
	const itemMeta = asRecord(item.meta);
	return (
		item.description ??
		readString(itemMeta.description) ??
		readString(asRecord(itemMeta.meta).description) ??
		item.housePackageTool?.stepProduct?.name ??
		null
	);
}

function normalizeItemUid(item: { id: number; meta: unknown }) {
	const itemMeta = asRecord(item.meta);
	return (
		readString(itemMeta.uid) ??
		readString(asRecord(itemMeta.meta).uid) ??
		`sales-item-${item.id}`
	);
}

function buildStepFormCandidate(
	step: {
		prodUid: string | null;
		value?: string | null;
		qty: number | null;
		price?: number | null;
		basePrice?: number | null;
		meta: unknown;
		step: { uid: string | null; title: string | null } | null;
		component: { uid: string | null; name: string | null } | null;
	},
	multiplier = 1,
	context?: StepSelectionContext,
): SyncComponentCandidate | null {
	const sourceUid = step.prodUid || step.component?.uid;
	const categoryUid = step.step?.uid;
	if (!sourceUid || !categoryUid) return null;

	const stepMeta = asRecord(step.meta);
	const selectedComponent = selectedComponentForStep(stepMeta, sourceUid);
	const variantUid = resolveCandidateVariantUid({
		sourceUid,
		stepMeta,
		selectedComponent,
		context,
	});
	const title =
		step.component?.name ??
		readString(selectedComponent.title) ??
		readString(stepMeta.title) ??
		readString(stepMeta.name) ??
		readString(step.value) ??
		sourceUid;
	const unitCostPrice = firstFiniteNumber(
		selectedComponent.basePrice,
		selectedComponent.costPrice,
		stepMeta.basePrice,
		step.basePrice,
	);
	const unitSalesPrice = firstFiniteNumber(
		selectedComponent.salesPrice,
		selectedComponent.price,
		stepMeta.salesPrice,
		stepMeta.price,
		step.price,
	);

	return {
		sourceType: "dyke-step-product",
		sourceUid,
		title,
		qty: asPositiveNumber(step.qty, 1) * asPositiveNumber(multiplier, 1),
		required: true,
		inventoryUid: sourceUid,
		variantUid,
		inventoryCategoryUid: categoryUid,
		inventoryCategoryTitle: step.step?.title || "Dyke Component",
		inventoryName: title,
		unitCostPrice,
		unitSalesPrice,
	};
}

function buildShelfCandidate(
	shelf: {
	productId: number | null;
	qty: number | null;
	description: string | null;
	categoryId: number | null;
	unitPrice?: number | null;
	totalPrice?: number | null;
	meta?: unknown;
	shelfProduct: { id: number; title: string | null } | null;
	category: { id: number; name: string | null } | null;
},
	options: { profileCoefficient?: number | null } = {},
): SyncComponentCandidate | null {
	if (!shelf.productId || !shelf.categoryId) return null;

	const uid = `shelf-prod-${shelf.productId}`;
	const title =
		shelf.shelfProduct?.title ||
		shelf.description ||
		`Shelf Item ${shelf.productId}`;
	const qty = asPositiveNumber(shelf.qty, 1);
	const meta = asRecord(shelf.meta);
	const fallbackUnitSalesPrice =
		firstPositiveNumber(
			meta.salesPrice,
			shelf.unitPrice,
			meta.unitPrice,
			numberSafeDivide(shelf.totalPrice, qty),
			numberSafeDivide(meta.totalPrice, qty),
		) ?? null;
	const fallbackUnitCostPrice =
		firstPositiveNumber(
			meta.basePrice,
			meta.baseUnitPrice,
			meta.costPrice,
			meta.unitCostPrice,
		) ?? null;
	const completedPricing = completeUnitPricingFromProfile({
		unitCostPrice: fallbackUnitCostPrice,
		unitSalesPrice: fallbackUnitSalesPrice,
		profileCoefficient: options.profileCoefficient,
	});

	return {
		sourceType: "shelf-product",
		sourceUid: uid,
		title,
		qty,
		required: true,
		inventoryUid: uid,
		variantUid: uid,
		inventoryCategoryUid: generateInventoryCategoryUidFromShelfCategoryId(
			shelf.categoryId,
		),
		inventoryCategoryTitle: shelf.category?.name || "Shelf Item",
		inventoryName: title,
		...completedPricing,
	};
}

function buildHousePackageCandidate(
	hpt: {
		totalDoors: number | null;
		dependenciesUid?: string | null;
		dimension?: string | null;
		meta?: unknown;
		stepProduct: {
			uid: string | null;
			name: string | null;
			step: { uid: string | null; title: string | null } | null;
		} | null;
	},
	fallbackQty?: number | null,
	fallbackUnitSalesPrice?: number | null,
	options: { profileCoefficient?: number | null } = {},
): SyncComponentCandidate | null {
	const sourceUid = hpt.stepProduct?.uid;
	const categoryUid = hpt.stepProduct?.step?.uid;
	if (!sourceUid || !categoryUid) return null;

	const title = hpt.stepProduct?.name || sourceUid;
	const variantUid =
		readDependencyUidFromRecord(asRecord(hpt.meta)) ??
		normalizeDykeDependencyUid(hpt.dependenciesUid) ??
		normalizeDykeDependencyUid(hpt.dimension) ??
		sourceUid;
	const qty = asPositiveNumber(
		hpt.totalDoors,
		sumDoorQty((hpt as SyncItemLike["housePackageTool"])?.doors) ||
			asPositiveNumber(fallbackQty, 1),
	);
	const hptMeta = asRecord(hpt.meta);
	const priceTags = asRecord(hptMeta.priceTags);
	const mouldingPrice = asRecord(priceTags.moulding);
	const completedPricing = completeUnitPricingFromProfile({
		unitCostPrice: firstPositiveNumber(
			mouldingPrice.basePrice,
			mouldingPrice.costPrice,
			mouldingPrice.unitCostPrice,
		),
		unitSalesPrice: firstPositiveNumber(
			mouldingPrice.salesPrice,
			mouldingPrice.price,
			mouldingPrice.overridePrice,
			fallbackUnitSalesPrice,
		),
		profileCoefficient: options.profileCoefficient,
	});

	return {
		sourceType: "dyke-house-package",
		sourceUid,
		title,
		qty,
		required: true,
		inventoryUid: sourceUid,
		variantUid,
		inventoryCategoryUid: categoryUid,
		inventoryCategoryTitle: hpt.stepProduct?.step?.title || "Dyke Component",
		inventoryName: title,
		...completedPricing,
	};
}

function buildDoorCandidate(door: {
	totalQty: number | null;
	dimension?: string | null;
	dependenciesUid?: string | null;
	meta?: unknown;
	unitPrice?: number | null;
	lineTotal?: number | null;
	stepProduct: {
		uid: string | null;
		name: string | null;
		step: { uid: string | null; title: string | null } | null;
	} | null;
}): SyncComponentCandidate | null {
	const sourceUid = door.stepProduct?.uid;
	const categoryUid = door.stepProduct?.step?.uid;
	if (!sourceUid || !categoryUid) return null;

	const title = door.stepProduct?.name || sourceUid;
	const variantUid =
		readDependencyUidFromRecord(asRecord(door.meta)) ??
		normalizeDykeDependencyUid(door.dependenciesUid) ??
		normalizeDykeDependencyUid(door.dimension) ??
		sourceUid;
	const qty = asPositiveNumber(door.totalQty, 1);
	const unitSalesPrice =
		firstFiniteNumber(door.unitPrice) ??
		(door.lineTotal == null ? null : numberSafeDivide(door.lineTotal, qty));

	return {
		sourceType: "dyke-door-product",
		sourceUid,
		title,
		qty,
		required: true,
		inventoryUid: sourceUid,
		variantUid,
		inventoryCategoryUid: categoryUid,
		inventoryCategoryTitle: door.stepProduct?.step?.title || "Dyke Component",
		inventoryName: title,
		unitSalesPrice,
	};
}

async function ensureSubComponentRecord(
	db: DbLike,
	input: {
		parentInventoryId: number;
		inventoryCategoryId: number;
		defaultInventoryId: number | null;
	},
) {
	const existing = await db.subComponents.findFirst({
		where: {
			parentId: input.parentInventoryId,
			inventoryCategoryId: input.inventoryCategoryId,
			deletedAt: null,
		},
		select: {
			id: true,
		},
	});

	if (existing) {
		return db.subComponents.update({
			where: {
				id: existing.id,
			},
			data: {
				deletedAt: null,
				defaultInventoryId: input.defaultInventoryId,
			},
			select: {
				id: true,
			},
		});
	}

	return db.subComponents.create({
		data: {
			parentId: input.parentInventoryId,
			inventoryCategoryId: input.inventoryCategoryId,
			defaultInventoryId: input.defaultInventoryId,
			status: "published",
		},
		select: {
			id: true,
		},
	});
}

type ComponentDemandState = {
	qtyAllocated: number;
	qtyInbound: number;
	qtyReceived: number;
	status:
		| "pending"
		| "allocated"
		| "partially_allocated"
		| "inbound_required"
		| "partially_received"
		| "fulfilled"
		| "cancelled";
};

export function planComponentDemandState(input: {
	qtyRequired: number;
	committedAllocationQty: number;
	suggestedAllocationQty: number;
	qtyReceived: number;
}): ComponentDemandState {
	const qtyRequired = Math.max(0, Number(input.qtyRequired || 0));
	const qtyAllocated = Math.max(0, Number(input.committedAllocationQty || 0));
	const suggestedAllocationQty = Math.max(
		qtyAllocated,
		Number(input.suggestedAllocationQty || 0),
	);
	const qtyInbound = Math.max(0, qtyRequired - suggestedAllocationQty);
	const qtyReceived = Math.max(0, Number(input.qtyReceived || 0));

	let status: ComponentDemandState["status"] = "pending";
	if (qtyRequired <= 0) {
		status = "cancelled";
	} else if (qtyReceived > 0 && qtyReceived < qtyInbound) {
		status = "partially_received";
	} else if (qtyReceived >= qtyInbound && qtyInbound > 0) {
		status =
			qtyAllocated + qtyReceived >= qtyRequired
				? "fulfilled"
				: "partially_received";
	} else if (qtyAllocated >= qtyRequired && qtyInbound <= 0) {
		status = "allocated";
	} else if (suggestedAllocationQty > 0) {
		status = "partially_allocated";
	} else if (qtyInbound > 0) {
		status = "inbound_required";
	}

	return {
		qtyAllocated,
		qtyInbound,
		qtyReceived,
		status,
	};
}

async function syncComponentFulfillment(
	db: DbLike,
	input: {
		lineItemComponentId: number;
		inventoryVariantId: number;
		qtyRequired: number;
		orderInventoryStatus?: string | null;
	},
): Promise<ComponentDemandState> {
	const qtyRequired = Math.max(0, input.qtyRequired);

	const [variant, stocks, existingAllocations, existingInboundDemands] =
		await Promise.all([
			db.inventoryVariant.findUnique({
				where: {
					id: input.inventoryVariantId,
				},
				select: {
					inventory: {
						select: {
							stockMode: true,
							inventoryCategory: {
								select: {
									stockMode: true,
								},
							},
						},
					},
				},
			}),
			db.inventoryStock.findMany({
				where: {
					inventoryVariantId: input.inventoryVariantId,
					deletedAt: null,
				},
				select: {
					id: true,
					qty: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			}),
			db.stockAllocation.findMany({
				where: {
					lineItemComponentId: input.lineItemComponentId,
					deletedAt: null,
					status: {
						in: [...ACTIVE_STOCK_ALLOCATION_STATUSES],
					},
				},
				select: {
					id: true,
					inventoryStockId: true,
					qty: true,
					status: true,
					notes: true,
				},
			}),
			db.inboundDemand.findMany({
				where: {
					lineItemComponentId: input.lineItemComponentId,
					deletedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
				select: {
					id: true,
					qty: true,
					qtyReceived: true,
					status: true,
					inboundShipmentItemId: true,
				},
			}),
		]);

	const isMonitored =
		(variant?.inventory?.inventoryCategory?.stockMode ||
			variant?.inventory?.stockMode) === "monitored";

	if (!isMonitored) {
		if (existingAllocations.length) {
			await db.stockAllocation.updateMany({
				where: {
					id: {
						in: existingAllocations.map((allocation) => allocation.id),
					},
				},
				data: {
					status: "released",
					deletedAt: new Date(),
				},
			});
		}

		if (existingInboundDemands.length) {
			await db.inboundDemand.updateMany({
				where: {
					id: {
						in: existingInboundDemands.map((demand) => demand.id),
					},
				},
				data: {
					status: "cancelled",
					deletedAt: new Date(),
				},
			});
		}

		return {
			qtyAllocated: 0,
			qtyInbound: 0,
			qtyReceived: 0,
			status: qtyRequired <= 0 ? "cancelled" : "pending",
		};
	}

	const activeReservedByStockId = new Map<number, number>();

	const globalAllocations = await db.stockAllocation.findMany({
		where: {
			inventoryVariantId: input.inventoryVariantId,
			deletedAt: null,
			status: {
				in: ["approved", "reserved", "picked", "consumed"],
			},
		},
		select: {
			id: true,
			inventoryStockId: true,
			qty: true,
			lineItemComponentId: true,
		},
	});

	for (const allocation of globalAllocations) {
		if (!allocation.inventoryStockId) continue;
		const current =
			activeReservedByStockId.get(allocation.inventoryStockId) || 0;
		activeReservedByStockId.set(
			allocation.inventoryStockId,
			current +
				(allocation.lineItemComponentId === input.lineItemComponentId
					? 0
					: Number(allocation.qty || 0)),
		);
	}

	let remaining = qtyRequired;
	const desiredAllocations = new Map<number, number>();

	for (const stock of stocks) {
		if (remaining <= 0) break;

		const stockQty = Number(stock.qty || 0);
		const reservedQty = activeReservedByStockId.get(stock.id) || 0;
		const availableQty = Math.max(0, stockQty - reservedQty);
		if (availableQty <= 0) continue;

		const assignedQty = Math.min(remaining, availableQty);
		if (assignedQty <= 0) continue;

		desiredAllocations.set(stock.id, assignedQty);
		remaining -= assignedQty;
	}

	const existingAllocationByStockId = new Map(
		existingAllocations
			.filter((allocation) => allocation.inventoryStockId)
			.map((allocation) => [allocation.inventoryStockId as number, allocation]),
	);

	for (const [inventoryStockId, qty] of desiredAllocations.entries()) {
		const existing = existingAllocationByStockId.get(inventoryStockId) as
			| {
					id: number;
					qty?: number | null;
					status?: string | null;
					notes?: string | null;
			  }
			| undefined;
		if (existing) {
			const shouldKeepApproved =
				existing.status === "approved" && Number(existing.qty || 0) === qty;
			await db.stockAllocation.update({
				where: {
					id: existing.id,
				},
				data: {
					qty,
					status: shouldKeepApproved ? "approved" : "pending_review",
					notes: shouldKeepApproved
						? existing.notes || undefined
						: "Suggested allocation awaiting manual approval",
					deletedAt: null,
				},
			});
		} else {
			await db.stockAllocation.create({
				data: {
					lineItemComponentId: input.lineItemComponentId,
					inventoryStockId,
					inventoryVariantId: input.inventoryVariantId,
					qty,
					status: "pending_review",
					notes: "Suggested allocation awaiting manual approval",
				},
			});
		}
	}

	const staleAllocationIds = existingAllocations
		.filter((allocation) => {
			const inventoryStockId = allocation.inventoryStockId;
			if (!inventoryStockId) return true;
			return !desiredAllocations.has(inventoryStockId);
		})
		.map((allocation) => allocation.id);

	if (staleAllocationIds.length) {
		await db.stockAllocation.updateMany({
			where: {
				id: {
					in: staleAllocationIds,
				},
			},
			data: {
				status: "released",
				deletedAt: new Date(),
			},
		});
	}

	const committedAllocationQty = existingAllocations.reduce(
		(sum, allocation) => {
			const stockId = allocation.inventoryStockId;
			if (!stockId) return sum;
			const desiredQty = desiredAllocations.get(stockId);
			if (!desiredQty) return sum;
			const isCommitted =
				allocation.status === "approved" &&
				Number(allocation.qty || 0) === Number(desiredQty || 0);
			return sum + (isCommitted ? Number(desiredQty || 0) : 0);
		},
		0,
	);
	const suggestedAllocationQty = Array.from(desiredAllocations.values()).reduce(
		(sum, qty) => sum + Number(qty || 0),
		0,
	);
	const qtyReceived = existingInboundDemands.reduce(
		(sum, demand) => sum + Number(demand.qtyReceived || 0),
		0,
	);
	const demandState = planComponentDemandState({
		qtyRequired,
		committedAllocationQty,
		suggestedAllocationQty,
		qtyReceived,
	});

	const primaryInboundDemand = existingInboundDemands[0] || null;

	if (demandState.qtyInbound > 0) {
		if (primaryInboundDemand) {
			await db.inboundDemand.update({
				where: {
					id: primaryInboundDemand.id,
				},
				data: {
					qty: demandState.qtyInbound,
					status: resolveProjectedInboundDemandStatus({
						orderInventoryStatus: input.orderInventoryStatus,
						qtyInbound: demandState.qtyInbound,
						qtyReceived: demandState.qtyReceived,
						inboundShipmentItemId:
							primaryInboundDemand.inboundShipmentItemId ?? null,
					}),
					deletedAt: null,
				},
			});
		} else {
			await db.inboundDemand.create({
				data: {
					lineItemComponentId: input.lineItemComponentId,
					inventoryVariantId: input.inventoryVariantId,
					qty: demandState.qtyInbound,
					status: resolveProjectedInboundDemandStatus({
						orderInventoryStatus: input.orderInventoryStatus,
						qtyInbound: demandState.qtyInbound,
						qtyReceived: demandState.qtyReceived,
					}),
				},
			});
		}
	} else if (existingInboundDemands.length) {
		await db.inboundDemand.updateMany({
			where: {
				id: {
					in: existingInboundDemands.map((demand) => demand.id),
				},
			},
			data: {
				deletedAt: new Date(),
				status: "cancelled",
			},
		});
	}

	if (existingInboundDemands.length > 1) {
		const extraDemandIds = existingInboundDemands
			.slice(1)
			.map((demand) => demand.id);
		if (extraDemandIds.length) {
			await db.inboundDemand.updateMany({
				where: {
					id: {
						in: extraDemandIds,
					},
				},
				data: {
					deletedAt: new Date(),
					status: "cancelled",
				},
			});
		}
	}

	return demandState;
}

export async function syncSalesInventoryLineItems(
	db: DbLike,
	input: SyncSalesInventoryLineItemsInput,
): Promise<SyncSalesInventoryLineItemsResult> {
	const source = input.source ?? "manual";
	const warnings: string[] = [];
	let createdCount = 0;
	let updatedCount = 0;
	let deletedCount = 0;
	let skippedCount = 0;

	const sale = await db.salesOrders.findFirstOrThrow({
		where: {
			id: input.salesOrderId,
		},
		select: {
			id: true,
			inventoryStatus: true,
			salesProfile: {
				select: {
					coefficient: true,
				},
			},
			lineItems: {
				select: {
					id: true,
					salesItemId: true,
					inventoryId: true,
					components: {
						select: {
							id: true,
							subComponentId: true,
						},
					},
				},
			},
			items: {
				where: {
					deletedAt: null,
				},
				select: {
					id: true,
					description: true,
					dykeProduction: true,
					qty: true,
					rate: true,
					total: true,
					meta: true,
					formSteps: {
						where: {
							deletedAt: null,
						},
						select: {
							id: true,
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
							qty: true,
							description: true,
							categoryId: true,
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
							id: true,
							deletedAt: true,
							totalDoors: true,
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
									id: true,
									totalQty: true,
									dimension: true,
									unitPrice: true,
									lineTotal: true,
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
		},
	});

	const syncedSalesItemIds = new Set<number>();

	for (const [index, item] of sale.items.entries()) {
		const itemMeta = asRecord(item.meta);
		const productionEligible = resolveSalesItemProductionEligibility(item);
		const title = normalizeItemTitle(item);
		const description = normalizeItemDescription(item);
		const uid = normalizeItemUid(item);
		const lineQty = asPositiveNumber(
			item.qty,
			housePackageDoorQty(
				item.housePackageTool && !item.housePackageTool.deletedAt
					? item.housePackageTool
					: metadataHousePackageTool(item),
			),
		);
		const itemComponents = new Map<string, SyncComponentCandidate>();

		for (const candidate of buildInventorySyncComponentCandidatesForItem(
			item,
			{
				profileCoefficient: sale.salesProfile?.coefficient ?? null,
			},
		)) {
			itemComponents.set(makeCandidateKey(candidate), candidate);
		}

		const mapping = await resolveInventoryMappingForItem(db, item);

		if (!mapping) {
			skippedCount += 1;
			warnings.push(
				`salesItem:${item.id}: missing deterministic inventory mapping for parent line item`,
			);
			continue;
		}

		const existing = await db.lineItem.findUnique({
			where: {
				salesItemId: item.id,
			},
			select: {
				id: true,
			},
		});

		const lineItemData = {
			uid,
			sn: index,
			title,
			description,
			qty: lineQty,
			unitCost: Number(item.rate || 0),
			totalCost: Number(item.total || 0),
			lineItemType: "SALE" as const,
			saleId: sale.id,
			salesItemId: item.id,
			inventoryId: mapping.inventoryId,
			inventoryVariantId: mapping.inventoryVariantId,
			inventoryCategoryId: mapping.inventoryCategoryId,
			deletedAt: null,
			meta: {
				...(itemMeta as Record<string, unknown>),
				production: {
					...asRecord(itemMeta.production),
					produceable: productionEligible,
				},
				inventorySync: {
					source,
					triggeredByUserId: input.triggeredByUserId ?? null,
					syncedAt: new Date().toISOString(),
					inventoryUid: mapping.inventoryUid,
					componentCount: itemComponents.size,
					productionProduceable: productionEligible,
				},
			} as Record<string, unknown>,
		};

		let lineItemId: number;

		if (existing) {
			await db.lineItem.update({
				where: {
					id: existing.id,
				},
				data: lineItemData,
			});
			lineItemId = existing.id;
			updatedCount += 1;
		} else {
			const created = await db.lineItem.create({
				data: lineItemData,
				select: {
					id: true,
				},
			});
			lineItemId = created.id;
			createdCount += 1;
		}

		syncedSalesItemIds.add(item.id);

		const refreshedLineItem = await db.lineItem.findUnique({
			where: {
				id: lineItemId,
			},
			select: {
				id: true,
				inventoryId: true,
				components: {
					select: {
						id: true,
						subComponentId: true,
						inventoryVariantId: true,
					},
				},
			},
		});

		if (!refreshedLineItem) continue;

		const syncedComponentIds = new Set<number>();

		for (const candidate of itemComponents.values()) {
			const componentMapping = await ensureInventoryMappingFromCandidate(
				db,
				candidate,
			);
			const componentQty = Math.max(1, Math.round(candidate.qty));
			const componentPricingInput = {
				...componentMapping,
				qty: componentQty,
			};
			const inventoryPricing = await resolveComponentLinePricingSnapshot(
				db,
				componentPricingInput,
			);
			const candidatePricing = resolveCandidateLinePricingSnapshot(
				candidate,
				componentPricingInput,
			);
			const componentPricing = mergeComponentLinePricingSnapshots(
				inventoryPricing,
				candidatePricing,
				componentPricingInput,
			);

			const subComponent = await ensureSubComponentRecord(db, {
				parentInventoryId: refreshedLineItem.inventoryId,
				inventoryCategoryId: componentMapping.inventoryCategoryId,
				defaultInventoryId: componentMapping.inventoryId,
			});

			const existingComponent = refreshedLineItem.components.find(
				(component) =>
					component.subComponentId === subComponent.id &&
					component.inventoryVariantId === componentMapping.inventoryVariantId,
			);

			const componentData = {
				lineItemId: refreshedLineItem.id,
				subComponentId: subComponent.id,
				inventoryCategoryId: componentMapping.inventoryCategoryId,
				inventoryId: componentMapping.inventoryId,
				inventoryVariantId: componentMapping.inventoryVariantId,
				qty: componentQty,
				required: candidate.required,
				qtyAllocated: 0,
				qtyInbound: 0,
				qtyReceived: 0,
				status: "pending" as const,
			};

			let lineItemComponentId: number;
			if (existingComponent) {
				await db.lineItemComponents.update({
					where: {
						id: existingComponent.id,
					},
					data: componentData,
				});
				lineItemComponentId = existingComponent.id;
				syncedComponentIds.add(existingComponent.id);
			} else {
				const createdComponent = await db.lineItemComponents.create({
					data: componentData,
					select: {
						id: true,
					},
				});
				lineItemComponentId = createdComponent.id;
				syncedComponentIds.add(createdComponent.id);
			}

			if (componentPricing) {
				await db.linePricing.upsert({
					where: {
						componentId: lineItemComponentId,
					},
					create: {
						componentId: lineItemComponentId,
						...componentPricing,
					},
					update: componentPricing,
				});
			} else {
				await db.linePricing.deleteMany({
					where: {
						componentId: lineItemComponentId,
					},
				});
			}

			const fulfillment = await syncComponentFulfillment(db, {
				lineItemComponentId,
				inventoryVariantId: componentMapping.inventoryVariantId,
				qtyRequired: componentQty,
				orderInventoryStatus: sale.inventoryStatus,
			});

			await db.lineItemComponents.update({
				where: {
					id: lineItemComponentId,
				},
				data: {
					qtyAllocated: fulfillment.qtyAllocated,
					qtyInbound: fulfillment.qtyInbound,
					qtyReceived: fulfillment.qtyReceived,
					status: fulfillment.status,
				},
			});
		}

		const staleComponentIds = refreshedLineItem.components
			.filter((component) => !syncedComponentIds.has(component.id))
			.map((component) => component.id);

		if (staleComponentIds.length) {
			await db.stockAllocation.updateMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
				data: {
					deletedAt: new Date(),
					status: "released",
				},
			});
			await db.stockAllocation.deleteMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
			});
			await db.inboundDemand.updateMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
				data: {
					deletedAt: new Date(),
					status: "cancelled",
				},
			});
			await db.inboundDemand.deleteMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
			});
			await db.lineItemComponents.deleteMany({
				where: {
					id: {
						in: staleComponentIds,
					},
				},
			});
		}
	}

	const staleLineItems = sale.lineItems.filter(
		(lineItem) =>
			lineItem.salesItemId && !syncedSalesItemIds.has(lineItem.salesItemId),
	);

	if (staleLineItems.length) {
		const staleIds = staleLineItems.map((lineItem) => lineItem.id);
		const staleComponents = await db.lineItemComponents.findMany({
			where: {
				lineItemId: {
					in: staleIds,
				},
			},
			select: {
				id: true,
			},
		});
		const staleComponentIds = staleComponents.map((component) => component.id);
		if (staleComponentIds.length) {
			await db.stockAllocation.updateMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
				data: {
					deletedAt: new Date(),
					status: "released",
				},
			});
			await db.stockAllocation.deleteMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
			});
			await db.inboundDemand.updateMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
				data: {
					deletedAt: new Date(),
					status: "cancelled",
				},
			});
			await db.inboundDemand.deleteMany({
				where: {
					lineItemComponentId: {
						in: staleComponentIds,
					},
				},
			});
		}
		await db.lineItemComponents.deleteMany({
			where: {
				lineItemId: {
					in: staleIds,
				},
			},
		});
		await db.lineItem.updateMany({
			where: {
				id: {
					in: staleIds,
				},
			},
			data: {
				deletedAt: new Date(),
			},
		});
		deletedCount = staleIds.length;
	}

	return {
		salesOrderId: sale.id,
		createdCount,
		updatedCount,
		deletedCount,
		skippedCount,
		warnings,
	};
}
