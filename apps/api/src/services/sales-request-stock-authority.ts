import { createHash } from "node:crypto";
import type { SalesFormLineItemRecord } from "@gnd/sales/sales-form";
import { resolveSalesInventoryTrackingPolicy } from "@gnd/sales/sales-inventory-tracking-policy";
import {
	type SyncItemLike,
	buildInventorySyncComponentCandidatesForItem,
	resolveSalesItemProductionEligibility,
} from "@gnd/sales/sync-sales-inventory-line-items";

export const SALES_REQUEST_STOCK_AUTHORITY_SCHEMA_VERSION = 1 as const;

/**
 * A pending-review row is not a confirmed fulfillment allocation, but it is
 * still an unresolved stock suggestion for an existing sale.  The low-touch
 * authority therefore treats it as occupied capacity and refuses to claim
 * that same stock is free.  This is intentionally more conservative than the
 * native allocator (which may replace pending suggestions); this resolver is
 * an automatic final-save gate, not an allocator.
 */
const CAPACITY_STOCK_ALLOCATION_STATUSES = [
	"pending_review",
	"approved",
	"reserved",
	"picked",
	"consumed",
] as const;

type CapacityStockAllocationStatus =
	(typeof CAPACITY_STOCK_ALLOCATION_STATUSES)[number];

const COMMITTED_STOCK_ALLOCATION_STATUSES = [
	"approved",
	"reserved",
	"picked",
	"consumed",
] as const;

type CommittedStockAllocationStatus =
	(typeof COMMITTED_STOCK_ALLOCATION_STATUSES)[number];

type InventoryCategoryRow = {
	id: number;
	uid: string;
	productKind: string;
	stockMode: string | null;
	deletedAt: Date | null;
};

type InventoryRow = {
	id: number;
	uid: string;
	inventoryCategoryId: number;
	productKind: string;
	stockMode: string | null;
	deletedAt: Date | null;
	inventoryCategory: InventoryCategoryRow | null;
};

type InventoryVariantRow = {
	id: number;
	uid: string;
	inventoryId: number;
	deletedAt: Date | null;
};

type InventoryStockRow = {
	id: number;
	inventoryVariantId: number;
	qty: number;
	deletedAt: Date | null;
};

type StockAllocationRow = {
	id: number;
	inventoryVariantId: number;
	inventoryStockId: number | null;
	qty: number;
	status: CapacityStockAllocationStatus;
	deletedAt: Date | null;
};

type InventoryFindManyArgs = {
	where: {
		uid: { in: string[] };
		deletedAt: null;
	};
	select: {
		id: true;
		uid: true;
		inventoryCategoryId: true;
		productKind: true;
		stockMode: true;
		deletedAt: true;
		inventoryCategory: {
			select: {
				id: true;
				uid: true;
				productKind: true;
				stockMode: true;
				deletedAt: true;
			};
		};
	};
};

type InventoryVariantFindManyArgs = {
	where: {
		inventoryId: { in: number[] };
		uid: { in: string[] };
		deletedAt: null;
	};
	select: {
		id: true;
		uid: true;
		inventoryId: true;
		deletedAt: true;
	};
};

type InventoryStockFindManyArgs = {
	where: {
		inventoryVariantId: { in: number[] };
		deletedAt: null;
	};
	select: {
		id: true;
		inventoryVariantId: true;
		qty: true;
		deletedAt: true;
	};
};

type StockAllocationFindManyArgs = {
	where: {
		inventoryVariantId: { in: number[] };
		deletedAt: null;
		status: { in: CapacityStockAllocationStatus[] };
	};
	select: {
		id: true;
		inventoryVariantId: true;
		inventoryStockId: true;
		qty: true;
		status: true;
		deletedAt: true;
	};
};

/**
 * This structural contract deliberately contains only read methods.  Prisma's
 * root client and transaction client both satisfy it, so the authority can be
 * resolved inside the final-save transaction without gaining write capability.
 */
export type SalesRequestStockAuthorityDatabase = {
	inventory: {
		findMany: (args: InventoryFindManyArgs) => Promise<InventoryRow[]>;
	};
	inventoryVariant: {
		findMany: (
			args: InventoryVariantFindManyArgs,
		) => Promise<InventoryVariantRow[]>;
	};
	inventoryStock: {
		findMany: (
			args: InventoryStockFindManyArgs,
		) => Promise<InventoryStockRow[]>;
	};
	stockAllocation: {
		findMany: (
			args: StockAllocationFindManyArgs,
		) => Promise<StockAllocationRow[]>;
	};
};

export type SalesRequestStockAuthorityInput = {
	db: SalesRequestStockAuthorityDatabase;
	candidate: {
		lineItems: readonly SalesFormLineItemRecord[];
	};
};

export type SalesRequestStockAuthorityIssueCode =
	| "line-items-required"
	| "line-identity-invalid"
	| "shelf-items-not-supported"
	| "services-not-supported"
	| "line-material-unmapped"
	| "component-identity-missing"
	| "component-identity-ambiguous"
	| "component-quantity-invalid"
	| "hpt-door-identity-missing"
	| "hpt-door-quantity-invalid"
	| "moulding-quantity-invalid"
	| "moulding-quantity-mismatch"
	| "inventory-not-found"
	| "inventory-ambiguous"
	| "inventory-category-mismatch"
	| "inventory-identity-invalid"
	| "inventory-variant-not-found"
	| "inventory-variant-ambiguous"
	| "inventory-untracked"
	| "stock-quantity-invalid"
	| "allocation-quantity-invalid"
	| "allocation-stock-mismatch"
	| "stock-overcommitted"
	| "stock-insufficient";

export type SalesRequestStockAuthorityIssue = {
	code: SalesRequestStockAuthorityIssueCode;
	lineUid?: string;
	sourceUid?: string;
	inventoryUid?: string;
	variantUid?: string;
	categoryUid?: string;
	inventoryStockId?: number;
	requiredQty?: number;
	availableQty?: number;
};

export type SalesRequestStockRequirement = {
	lineUid: string;
	sourceType: string;
	sourceUid: string;
	inventoryUid: string;
	variantUid: string;
	categoryUid: string;
	requiredQty: number;
	inventoryId: number;
	inventoryVariantId: number;
	inventoryCategoryId: number;
	physicalQty: number;
	committedQty: number;
	pendingReviewQty: number;
	availableQty: number;
};

export type SalesRequestStockAuthority = {
	schemaVersion: typeof SALES_REQUEST_STOCK_AUTHORITY_SCHEMA_VERSION;
	/**
	 * Digest of this read-only observation. It is not a reservation or lock and
	 * must be recomputed inside the native save transaction.
	 */
	revision: string;
	requirements: SalesRequestStockRequirement[];
};

export type SalesRequestStockAuthorityResult =
	| {
			ok: true;
			issues: [];
			authority: SalesRequestStockAuthority;
	  }
	| {
			ok: false;
			issues: SalesRequestStockAuthorityIssue[];
			authority: null;
	  };

type ObjectRecord = Record<string, unknown>;

type PreparedLine = {
	lineUid: string | null;
	line: SalesFormLineItemRecord;
	item: SyncItemLike;
	formSteps: ObjectRecord[];
	shelfItems: ObjectRecord[];
	housePackageTool: ObjectRecord | null;
	mouldingRows: ObjectRecord[];
};

type MappedRequirement = {
	lineUid: string;
	sourceType: string;
	sourceUid: string;
	inventoryUid: string;
	variantUid: string;
	categoryUid: string;
	qty: number;
};

function asRecord(value: unknown): ObjectRecord {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as ObjectRecord)
		: {};
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
	if (value == null || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function positiveInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) > 0;
}

function nonnegativeInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) >= 0;
}

function arrayValue(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function metadata(line: SalesFormLineItemRecord) {
	return asRecord(line.meta);
}

function effectiveArray(
	line: SalesFormLineItemRecord,
	key: "formSteps" | "shelfItems",
) {
	const direct = Array.isArray(line[key]) ? line[key] : [];
	if (direct.length) return direct;
	return arrayValue(metadata(line)[key]);
}

function effectiveHousePackageTool(line: SalesFormLineItemRecord) {
	const direct = asRecord(line.housePackageTool);
	if (Object.keys(direct).length) return direct;
	const fromMeta = asRecord(metadata(line).housePackageTool);
	return Object.keys(fromMeta).length ? fromMeta : null;
}

function selectedComponents(step: ObjectRecord) {
	return arrayValue(asRecord(step.meta).selectedComponents).map(asRecord);
}

function stepTitle(step: ObjectRecord) {
	return (
		readString(asRecord(step.step).title) ??
		readString(asRecord(step.meta).stepTitle) ??
		""
	);
}

function firstSelectedComponent(step: ObjectRecord) {
	return selectedComponents(step)[0] ?? {};
}

function adaptFormStep(raw: unknown): SyncItemLike["formSteps"][number] {
	const step = asRecord(raw);
	const stepRef = asRecord(step.step);
	const component = asRecord(step.component);
	const selected = firstSelectedComponent(step);
	return {
		prodUid:
			readString(step.prodUid) ??
			readString(component.uid) ??
			readString(selected.uid),
		value: readString(step.value),
		qty: readNumber(step.qty),
		price: readNumber(step.price),
		basePrice: readNumber(step.basePrice),
		meta: step.meta,
		step: {
			uid: readString(stepRef.uid),
			title: readString(stepRef.title),
		},
		component: {
			uid: readString(component.uid) ?? readString(selected.uid),
			name:
				readString(component.name) ??
				readString(selected.title) ??
				readString(step.value),
		},
	};
}

function adaptShelfItem(raw: unknown): SyncItemLike["shelfItems"][number] {
	const shelf = asRecord(raw);
	const shelfMeta = asRecord(shelf.meta);
	const productId = readNumber(shelf.productId) ?? readNumber(shelf.id);
	const categoryId =
		readNumber(shelf.categoryId) ?? readNumber(shelfMeta.shelfParentCategoryId);
	return {
		productId,
		qty: readNumber(shelf.qty),
		description: readString(shelf.description),
		categoryId,
		unitPrice: readNumber(shelf.unitPrice),
		totalPrice: readNumber(shelf.totalPrice),
		meta: shelf.meta,
		shelfProduct: productId
			? { id: productId, title: readString(shelf.description) }
			: null,
		category: categoryId
			? { id: categoryId, name: readString(shelfMeta.categoryName) }
			: null,
	};
}

function doorStepFor(formSteps: ObjectRecord[]) {
	return formSteps.find(
		(step) => stepTitle(step).trim().toLowerCase() === "door",
	);
}

function doorQuantity(rawDoor: ObjectRecord): number | null {
	const explicit = rawDoor.totalQty;
	const lh = rawDoor.lhQty;
	const rh = rawDoor.rhQty;
	if (positiveInteger(explicit)) {
		if (lh != null || rh != null) {
			if (!nonnegativeInteger(lh) || !nonnegativeInteger(rh)) return null;
			if (lh + rh > 0 && explicit !== lh + rh) return null;
		}
		return explicit;
	}
	if (
		lh != null &&
		rh != null &&
		nonnegativeInteger(lh) &&
		nonnegativeInteger(rh) &&
		lh + rh > 0
	) {
		return lh + rh;
	}
	return null;
}

function adaptHousePackageTool(
	raw: ObjectRecord | null,
	formSteps: ObjectRecord[],
	line: SalesFormLineItemRecord,
): SyncItemLike["housePackageTool"] {
	if (!raw) return null;
	const hptMeta = asRecord(raw.meta);
	const doorStep = doorStepFor(formSteps);
	const selectedDoor = doorStep ? firstSelectedComponent(doorStep) : {};
	const rawRoot = asRecord(raw.stepProduct);
	const rootDoor = arrayValue(raw.doors)[0];
	const rootDoorMeta = asRecord(asRecord(rootDoor).meta);
	const rootUid =
		readString(rawRoot.uid) ??
		readString(raw.stepProductUid) ??
		readString(raw.componentUid) ??
		readString(hptMeta.componentUid) ??
		readString(selectedDoor.uid) ??
		readString(rootDoorMeta.componentUid);
	const rootStep = asRecord(rawRoot.step);
	const rootStepUid =
		readString(rootStep.uid) ??
		readString(raw.stepUid) ??
		readString(hptMeta.stepUid) ??
		(doorStep ? readString(asRecord(doorStep.step).uid) : null);
	const rootTitle =
		readString(rawRoot.name) ??
		readString(hptMeta.componentTitle) ??
		readString(selectedDoor.title) ??
		readString(line.title) ??
		rootUid;

	const doors = arrayValue(raw.doors).map((rawValue) => {
		const door = asRecord(rawValue);
		const doorMeta = asRecord(door.meta);
		const doorStepProduct = asRecord(door.stepProduct);
		const componentUid =
			readString(doorMeta.componentUid) ?? readString(door.componentUid);
		const stepProductId = door.stepProductId;
		const availableDoors = selectedComponents(doorStep ?? {});
		const selected =
			availableDoors.find(
				(component) =>
					(componentUid && readString(component.uid) === componentUid) ||
					(positiveInteger(stepProductId) && component.id === stepProductId),
			) ?? (stepProductId == null ? selectedDoor : {});
		const uid =
			readString(doorStepProduct.uid) ??
			componentUid ??
			readString(selected.uid) ??
			(stepProductId == null ? rootUid : null);
		const doorStepRef = asRecord(doorStepProduct.step);
		const uidForDoor =
			readString(doorStepRef.uid) ??
			readString(doorMeta.stepUid) ??
			rootStepUid;
		return {
			totalQty: doorQuantity(door),
			dimension: readString(door.dimension),
			meta: door.meta,
			dependenciesUid: readString(door.dependenciesUid),
			unitPrice: readNumber(door.unitPrice),
			lineTotal: readNumber(door.lineTotal),
			stepProduct:
				uid && uidForDoor
					? {
							uid,
							name:
								readString(doorStepProduct.name) ??
								readString(doorMeta.componentTitle) ??
								readString(selected.title) ??
								uid,
							step: {
								uid: uidForDoor,
								title:
									readString(doorStepRef.title) ??
									readString(asRecord(doorStep?.step).title) ??
									"Door",
							},
						}
					: null,
		};
	});

	return {
		deletedAt: null,
		totalDoors: readNumber(raw.totalDoors),
		dimension: readString(raw.dimension),
		dependenciesUid: readString(raw.dependenciesUid),
		meta: raw.meta,
		stepProduct:
			rootUid && rootStepUid
				? {
						uid: rootUid,
						name: rootTitle,
						step: {
							uid: rootStepUid,
							title:
								readString(rootStep.title) ??
								(doorStep ? stepTitle(doorStep) : null) ??
								"Door",
						},
					}
				: null,
		doors,
	};
}

function prepareLine(line: SalesFormLineItemRecord, index: number) {
	const lineUid = readString(line.uid);
	const formSteps = effectiveArray(line, "formSteps").map(asRecord);
	const shelfItems = effectiveArray(line, "shelfItems").map(asRecord);
	const housePackageTool = effectiveHousePackageTool(line);
	const mouldingRows = [
		...arrayValue(metadata(line).mouldingRows),
		...arrayValue(asRecord(metadata(line).meta).mouldingRows),
	].map(asRecord);
	const adaptedFormSteps = formSteps.map(adaptFormStep);
	const adaptedShelfItems = shelfItems.map(adaptShelfItem);
	const item: SyncItemLike = {
		id: positiveInteger(line.id) ? line.id : index + 1,
		description: readString(line.description) ?? readString(line.title),
		qty: readNumber(line.qty),
		rate: readNumber(line.unitPrice),
		total: readNumber(line.lineTotal),
		dykeProduction:
			typeof line.dykeProduction === "boolean" ? line.dykeProduction : null,
		meta: line.meta,
		formSteps: adaptedFormSteps,
		shelfItems: adaptedShelfItems,
		housePackageTool: adaptHousePackageTool(housePackageTool, formSteps, line),
	};
	return {
		lineUid,
		line,
		item,
		formSteps,
		shelfItems,
		housePackageTool,
		mouldingRows,
	} satisfies PreparedLine;
}

function isServiceLine(prepared: PreparedLine) {
	const values = prepared.formSteps.map((step) =>
		readString(step.value)?.toLowerCase(),
	);
	const meta = metadata(prepared.line);
	const nestedMeta = asRecord(meta.meta);
	const serviceRows = [
		...arrayValue(meta.serviceRows),
		...arrayValue(nestedMeta.serviceRows),
	];
	return (
		serviceRows.length > 0 ||
		values.some((value) => value === "service" || value === "services") ||
		[
			readString(meta.itemType),
			readString(meta.doorType),
			readString(nestedMeta.itemType),
			readString(nestedMeta.doorType),
		].some((value) => {
			const normalized = value?.toLowerCase();
			return normalized === "service" || normalized === "services";
		})
	);
}

function isShelfLine(prepared: PreparedLine) {
	if (prepared.shelfItems.length > 0) return true;
	return prepared.formSteps.some((step) => {
		const value = readString(step.value)?.toLowerCase();
		return (
			value === "shelf" ||
			value === "shelves" ||
			value === "shelf item" ||
			value === "shelf items"
		);
	});
}

function issue(
	code: SalesRequestStockAuthorityIssueCode,
	context: Omit<SalesRequestStockAuthorityIssue, "code"> = {},
) {
	return { code, ...context };
}

function issueKey(value: SalesRequestStockAuthorityIssue) {
	return JSON.stringify(value);
}

function pushIssue(
	issues: SalesRequestStockAuthorityIssue[],
	seen: Set<string>,
	value: SalesRequestStockAuthorityIssue,
) {
	const key = issueKey(value);
	if (seen.has(key)) return;
	seen.add(key);
	issues.push(value);
}

function validatePreparedLine(
	prepared: PreparedLine,
	issues: SalesRequestStockAuthorityIssue[],
	seen: Set<string>,
) {
	if (!prepared.lineUid) {
		pushIssue(issues, seen, issue("line-identity-invalid"));
		return;
	}
	if (!positiveInteger(prepared.line.qty)) {
		pushIssue(
			issues,
			seen,
			issue("component-quantity-invalid", { lineUid: prepared.lineUid }),
		);
	}
	if (isShelfLine(prepared)) {
		pushIssue(
			issues,
			seen,
			issue("shelf-items-not-supported", { lineUid: prepared.lineUid }),
		);
		return;
	}
	if (isServiceLine(prepared)) {
		pushIssue(
			issues,
			seen,
			issue("services-not-supported", { lineUid: prepared.lineUid }),
		);
		return;
	}

	for (const step of prepared.formSteps) {
		const selected = selectedComponents(step);
		const sourceUid =
			readString(step.prodUid) ??
			readString(asRecord(step.component).uid) ??
			readString(selected[0]?.uid);
		const categoryUid = readString(asRecord(step.step).uid);
		const structural = [
			"line item",
			"shelf items",
			"service",
			"services",
		].includes(stepTitle(step).trim().toLowerCase());
		if (!sourceUid && structural) continue;
		if (!sourceUid || !categoryUid) {
			pushIssue(
				issues,
				seen,
				issue("component-identity-missing", {
					lineUid: prepared.lineUid,
					sourceUid: sourceUid ?? undefined,
					categoryUid: categoryUid ?? undefined,
				}),
			);
			continue;
		}
		if (step.qty != null && step.qty !== "" && !positiveInteger(step.qty)) {
			pushIssue(
				issues,
				seen,
				issue("component-quantity-invalid", {
					lineUid: prepared.lineUid,
					sourceUid,
				}),
			);
		}
		const selectedUids = new Set(
			selected
				.map((component) => readString(component.uid))
				.filter((uid): uid is string => Boolean(uid)),
		);
		if (
			selectedUids.size > 1 &&
			!readString(step.prodUid) &&
			!readString(asRecord(step.component).uid)
		) {
			pushIssue(
				issues,
				seen,
				issue("component-identity-ambiguous", {
					lineUid: prepared.lineUid,
					sourceUid,
				}),
			);
		}
	}

	if (prepared.housePackageTool) {
		const doors = arrayValue(prepared.housePackageTool.doors).map(asRecord);
		if (doors.length) {
			let doorQty = 0;
			let everyDoorQtyIsValid = true;
			for (const [index, door] of doors.entries()) {
				const quantity = doorQuantity(door);
				if (!quantity) {
					everyDoorQtyIsValid = false;
					pushIssue(
						issues,
						seen,
						issue("hpt-door-quantity-invalid", {
							lineUid: prepared.lineUid,
						}),
					);
				} else {
					doorQty += quantity;
				}
				const doorMeta = asRecord(door.meta);
				const uid =
					readString(asRecord(door.stepProduct).uid) ??
					readString(door.componentUid) ??
					readString(doorMeta.componentUid) ??
					readString(
						prepared.item.housePackageTool?.doors?.[index]?.stepProduct?.uid,
					);
				if (
					!uid ||
					(door.stepProductId != null && !positiveInteger(door.stepProductId))
				) {
					pushIssue(
						issues,
						seen,
						issue("hpt-door-identity-missing", {
							lineUid: prepared.lineUid,
						}),
					);
				}
			}
			const totalDoors = prepared.housePackageTool.totalDoors;
			if (
				everyDoorQtyIsValid &&
				((totalDoors != null && totalDoors !== doorQty) ||
					prepared.line.qty !== doorQty)
			) {
				pushIssue(
					issues,
					seen,
					issue("hpt-door-quantity-invalid", {
						lineUid: prepared.lineUid,
					}),
				);
			}
		} else {
			const totalDoors = prepared.housePackageTool.totalDoors;
			const lineQty = prepared.line.qty;
			if (
				(totalDoors != null &&
					(!Number.isSafeInteger(totalDoors) || Number(totalDoors) < 0)) ||
				((totalDoors == null || totalDoors === 0) && !positiveInteger(lineQty))
			) {
				pushIssue(
					issues,
					seen,
					issue("hpt-door-quantity-invalid", {
						lineUid: prepared.lineUid,
					}),
				);
			}
		}
	}

	for (const row of prepared.mouldingRows) {
		const uid = readString(row.uid);
		if (!uid) {
			pushIssue(
				issues,
				seen,
				issue("component-identity-missing", {
					lineUid: prepared.lineUid,
				}),
			);
		}
		if (!positiveInteger(row.qty)) {
			pushIssue(
				issues,
				seen,
				issue("moulding-quantity-invalid", { lineUid: prepared.lineUid }),
			);
		}
		const selectedByMouldingStep = prepared.formSteps.some(
			(step) =>
				/^(?:moulding|molding)s?$/i.test(stepTitle(step).trim()) &&
				selectedComponents(step).some(
					(component) => readString(component.uid) === uid,
				),
		);
		if (uid && !selectedByMouldingStep) {
			pushIssue(
				issues,
				seen,
				issue("component-identity-missing", {
					lineUid: prepared.lineUid,
					sourceUid: uid,
				}),
			);
		}
	}
}

function mapPreparedLine(prepared: PreparedLine): MappedRequirement[] {
	const mouldingStepIndex = prepared.formSteps.findIndex((step) =>
		/^(?:moulding|molding)s?$/i.test(stepTitle(step).trim()),
	);
	const mouldingStep = prepared.formSteps[mouldingStepIndex];
	const mouldingStepUid = mouldingStep
		? readString(asRecord(mouldingStep.step).uid)
		: null;
	const mouldingUids = new Set(
		prepared.mouldingRows
			.map((row) => readString(row.uid))
			.filter((uid): uid is string => Boolean(uid)),
	);
	const candidates = buildInventorySyncComponentCandidatesForItem(prepared.item)
		.filter(
			(candidate) =>
				candidate.required &&
				!(
					mouldingStepUid === candidate.inventoryCategoryUid &&
					mouldingUids.has(candidate.sourceUid)
				),
		)
		.slice();

	if (mouldingStep && mouldingStepUid) {
		const selected = selectedComponents(mouldingStep);
		for (const row of prepared.mouldingRows) {
			const uid = readString(row.uid);
			const qty = readNumber(row.qty);
			const component = selected.find(
				(candidate) => readString(candidate.uid) === uid,
			);
			if (!uid || !positiveInteger(qty) || !component) continue;
			const adaptedStep = prepared.item.formSteps[mouldingStepIndex];
			if (!adaptedStep) continue;
			const selectedTitle =
				readString(component.title) ?? readString(row.title) ?? uid;
			const item: SyncItemLike = {
				...prepared.item,
				formSteps: prepared.item.formSteps.map((step, index) =>
					index !== mouldingStepIndex
						? step
						: {
								...adaptedStep,
								prodUid: uid,
								value: selectedTitle,
								qty,
								component: { uid, name: selectedTitle },
								meta: {
									...asRecord(adaptedStep.meta),
									selectedProdUids: [uid],
									selectedComponents: [component],
								},
							},
				),
			};
			candidates.push(
				...buildInventorySyncComponentCandidatesForItem(item).filter(
					(candidate) =>
						candidate.required &&
						candidate.sourceUid === uid &&
						candidate.inventoryCategoryUid === mouldingStepUid,
				),
			);
		}
	}

	return candidates.map((candidate) => ({
		lineUid: prepared.lineUid || "",
		sourceType: candidate.sourceType,
		sourceUid: candidate.sourceUid,
		inventoryUid: candidate.inventoryUid,
		variantUid: candidate.variantUid,
		categoryUid: candidate.inventoryCategoryUid,
		qty: candidate.qty,
	}));
}

function validateMappedLine(
	prepared: PreparedLine,
	requirements: MappedRequirement[],
	issues: SalesRequestStockAuthorityIssue[],
	seen: Set<string>,
) {
	if (
		!requirements.length &&
		resolveSalesItemProductionEligibility(prepared.item)
	) {
		pushIssue(
			issues,
			seen,
			issue("line-material-unmapped", {
				lineUid: prepared.lineUid ?? undefined,
			}),
		);
		return;
	}
	for (const requirement of requirements) {
		if (!positiveInteger(requirement.qty)) {
			pushIssue(
				issues,
				seen,
				issue("component-quantity-invalid", {
					lineUid: requirement.lineUid,
					sourceUid: requirement.sourceUid,
				}),
			);
		}
	}
	if (prepared.mouldingRows.length) {
		const expectedByUid = new Map<string, number>();
		for (const row of prepared.mouldingRows) {
			const uid = readString(row.uid);
			const qty = row.qty;
			if (!uid || !positiveInteger(qty)) continue;
			expectedByUid.set(uid, (expectedByUid.get(uid) || 0) + qty);
		}
		for (const [uid, expectedQty] of expectedByUid) {
			const actualQty = requirements
				.filter((requirement) => requirement.sourceUid === uid)
				.reduce((sum, requirement) => sum + requirement.qty, 0);
			if (actualQty !== expectedQty) {
				pushIssue(
					issues,
					seen,
					issue("moulding-quantity-mismatch", {
						lineUid: prepared.lineUid ?? undefined,
						sourceUid: uid,
					}),
				);
			}
		}
	}
}

function stableJson(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value) ?? "null";
	}
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
		.join(",")}}`;
}

function authorityRevision(value: unknown) {
	const digest = createHash("sha256")
		.update("gnd:sales-request-stock-authority:v1\0")
		.update(stableJson(value))
		.digest("hex");
	return `sa1:${digest}`;
}

function identityKey(inventoryId: number, variantUid: string) {
	return `${inventoryId}\0${variantUid}`;
}

/**
 * Resolve read-only stock capacity for a final-save candidate.
 *
 * The resolver intentionally does not read newly-created LineItem rows: the
 * new-form save creates those rows before queueing post-save inventory sync.
 * Instead it replays the existing pure sync candidate mapper, resolves each
 * candidate against one active Inventory/InventoryVariant/category identity,
 * and computes conservative free capacity from physical stock minus committed
 * and pending-review allocations. Pending-review rows are unresolved
 * suggestions, so they are not proof of fulfillment, but this automatic
 * authority refuses to claim their stock as free. Inbound demand is not
 * physical availability. This result is observational evidence only: it does
 * not reserve stock and cannot prevent another transaction from consuming
 * capacity after the reads complete. Final save must recompute it inside the
 * native SERIALIZABLE save transaction before persistence; allocation remains
 * an explicit downstream command.
 * Legacy HPT stepProductId values may resolve only through the canonical UID
 * snapshot used by the shared mapper. No direct numeric inventory fallback is
 * accepted; UID/category/variant mismatches, malformed quantities, and all
 * duplicate identities fail closed.
 */
export async function resolveSalesRequestStockAuthority(
	input: SalesRequestStockAuthorityInput,
): Promise<SalesRequestStockAuthorityResult> {
	const issues: SalesRequestStockAuthorityIssue[] = [];
	const seenIssues = new Set<string>();
	const lines = input.candidate?.lineItems;
	if (!Array.isArray(lines) || !lines.length) {
		return {
			ok: false,
			issues: [issue("line-items-required")],
			authority: null,
		};
	}

	const preparedLines = lines.map((line, index) => prepareLine(line, index));
	const lineUids = new Set<string>();
	for (const prepared of preparedLines) {
		validatePreparedLine(prepared, issues, seenIssues);
		if (prepared.lineUid) {
			if (lineUids.has(prepared.lineUid)) {
				pushIssue(
					issues,
					seenIssues,
					issue("line-identity-invalid", { lineUid: prepared.lineUid }),
				);
			}
			lineUids.add(prepared.lineUid);
		}
	}
	if (issues.length) return { ok: false, issues, authority: null };

	const mappedRequirements = preparedLines.flatMap((prepared) => {
		const requirements = mapPreparedLine(prepared);
		validateMappedLine(prepared, requirements, issues, seenIssues);
		return requirements;
	});
	if (issues.length) return { ok: false, issues, authority: null };

	const requirementsByIdentity = new Map<string, MappedRequirement>();
	for (const requirement of mappedRequirements) {
		const key = [
			requirement.lineUid,
			requirement.sourceType,
			requirement.sourceUid,
			requirement.inventoryUid,
			requirement.variantUid,
			requirement.categoryUid,
		].join("\0");
		const existing = requirementsByIdentity.get(key);
		if (existing) {
			existing.qty += requirement.qty;
		} else {
			requirementsByIdentity.set(key, { ...requirement });
		}
	}
	const requirements = Array.from(requirementsByIdentity.values()).sort(
		(left, right) => stableJson(left).localeCompare(stableJson(right)),
	);
	if (!requirements.length) {
		return {
			ok: false,
			issues: [issue("line-material-unmapped")],
			authority: null,
		};
	}

	const inventoryUids = Array.from(
		new Set(requirements.map((requirement) => requirement.inventoryUid)),
	).sort();
	const inventoryRows = await input.db.inventory.findMany({
		where: { uid: { in: inventoryUids }, deletedAt: null },
		select: {
			id: true,
			uid: true,
			inventoryCategoryId: true,
			productKind: true,
			stockMode: true,
			deletedAt: true,
			inventoryCategory: {
				select: {
					id: true,
					uid: true,
					productKind: true,
					stockMode: true,
					deletedAt: true,
				},
			},
		},
	});

	const inventoryByUid = new Map<string, InventoryRow[]>();
	for (const row of inventoryRows) {
		const current = inventoryByUid.get(row.uid) || [];
		current.push(row);
		inventoryByUid.set(row.uid, current);
	}
	const resolvedInventories = new Map<string, InventoryRow>();
	for (const requirement of requirements) {
		const rows = inventoryByUid.get(requirement.inventoryUid) || [];
		if (!rows.length) {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-not-found", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
				}),
			);
			continue;
		}
		if (rows.length !== 1) {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-ambiguous", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
				}),
			);
			continue;
		}
		const inventory = rows[0];
		if (
			!inventory ||
			!positiveInteger(inventory.id) ||
			!positiveInteger(inventory.inventoryCategoryId) ||
			inventory.uid !== requirement.inventoryUid ||
			inventory.deletedAt !== null
		) {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-identity-invalid", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
				}),
			);
			continue;
		}
		if (
			!inventory.inventoryCategory ||
			inventory.inventoryCategory.deletedAt !== null ||
			inventory.inventoryCategory.id !== inventory.inventoryCategoryId ||
			inventory.inventoryCategory.uid !== requirement.categoryUid
		) {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-category-mismatch", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
					categoryUid: requirement.categoryUid,
				}),
			);
			continue;
		}
		const policy = resolveSalesInventoryTrackingPolicy({
			inventoryId: inventory.id,
			inventory: {
				id: inventory.id,
				productKind: inventory.productKind,
				stockMode: inventory.stockMode,
			},
			inventoryCategory: {
				productKind: inventory.inventoryCategory.productKind,
				stockMode: inventory.inventoryCategory.stockMode,
			},
		});
		if (policy !== "tracked") {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-untracked", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
					variantUid: requirement.variantUid,
				}),
			);
			continue;
		}
		resolvedInventories.set(requirement.inventoryUid, inventory);
	}
	if (issues.length) return { ok: false, issues, authority: null };

	const inventoryIds = Array.from(
		new Set(Array.from(resolvedInventories.values()).map((row) => row.id)),
	).sort((left, right) => left - right);
	const variantUids = Array.from(
		new Set(requirements.map((requirement) => requirement.variantUid)),
	).sort();
	const variantRows = await input.db.inventoryVariant.findMany({
		where: {
			inventoryId: { in: inventoryIds },
			uid: { in: variantUids },
			deletedAt: null,
		},
		select: { id: true, uid: true, inventoryId: true, deletedAt: true },
	});
	const variantsByIdentity = new Map<string, InventoryVariantRow[]>();
	for (const row of variantRows) {
		const current =
			variantsByIdentity.get(identityKey(row.inventoryId, row.uid)) || [];
		current.push(row);
		variantsByIdentity.set(identityKey(row.inventoryId, row.uid), current);
	}

	const resolvedRequirements = requirements.map((requirement) => {
		const inventory = resolvedInventories.get(requirement.inventoryUid);
		const rows = inventory
			? variantsByIdentity.get(
					identityKey(inventory.id, requirement.variantUid),
				) || []
			: [];
		if (!rows.length) {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-variant-not-found", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
					variantUid: requirement.variantUid,
				}),
			);
			return null;
		}
		if (rows.length !== 1) {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-variant-ambiguous", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
					variantUid: requirement.variantUid,
				}),
			);
			return null;
		}
		const variant = rows[0];
		if (
			!variant ||
			!positiveInteger(variant.id) ||
			variant.inventoryId !== inventory?.id ||
			variant.deletedAt !== null
		) {
			pushIssue(
				issues,
				seenIssues,
				issue("inventory-identity-invalid", {
					lineUid: requirement.lineUid,
					inventoryUid: requirement.inventoryUid,
					variantUid: requirement.variantUid,
				}),
			);
			return null;
		}
		return {
			requirement,
			inventory,
			variant,
		};
	});
	if (issues.length) return { ok: false, issues, authority: null };

	const resolved = resolvedRequirements.filter(
		(value): value is NonNullable<typeof value> => value !== null,
	);
	const variantIds = Array.from(
		new Set(resolved.map((value) => value.variant.id)),
	).sort((left, right) => left - right);
	const [stocks, allocations] = await Promise.all([
		input.db.inventoryStock.findMany({
			where: { inventoryVariantId: { in: variantIds }, deletedAt: null },
			select: {
				id: true,
				inventoryVariantId: true,
				qty: true,
				deletedAt: true,
			},
		}),
		input.db.stockAllocation.findMany({
			where: {
				inventoryVariantId: { in: variantIds },
				deletedAt: null,
				status: { in: [...CAPACITY_STOCK_ALLOCATION_STATUSES] },
			},
			select: {
				id: true,
				inventoryVariantId: true,
				inventoryStockId: true,
				qty: true,
				status: true,
				deletedAt: true,
			},
		}),
	]);

	const stockById = new Map<number, InventoryStockRow>();
	const stockByVariant = new Map<number, InventoryStockRow[]>();
	for (const stock of stocks) {
		if (
			!positiveInteger(stock.id) ||
			!positiveInteger(stock.inventoryVariantId) ||
			!variantIds.includes(stock.inventoryVariantId) ||
			!Number.isFinite(stock.qty) ||
			stock.qty < 0 ||
			stock.deletedAt !== null
		) {
			pushIssue(issues, seenIssues, issue("stock-quantity-invalid"));
			continue;
		}
		if (stockById.has(stock.id)) {
			pushIssue(issues, seenIssues, issue("stock-quantity-invalid"));
			continue;
		}
		stockById.set(stock.id, stock);
		const current = stockByVariant.get(stock.inventoryVariantId) || [];
		current.push(stock);
		stockByVariant.set(stock.inventoryVariantId, current);
	}

	const committedByStockId = new Map<number, number>();
	const pendingReviewByStockId = new Map<number, number>();
	for (const allocation of allocations) {
		if (
			!positiveInteger(allocation.id) ||
			!positiveInteger(allocation.inventoryVariantId) ||
			!variantIds.includes(allocation.inventoryVariantId) ||
			!Number.isFinite(allocation.qty) ||
			allocation.qty <= 0 ||
			allocation.deletedAt !== null
		) {
			pushIssue(issues, seenIssues, issue("allocation-quantity-invalid"));
			continue;
		}
		if (!allocation.inventoryStockId) {
			pushIssue(issues, seenIssues, issue("allocation-stock-mismatch"));
			continue;
		}
		const stock = stockById.get(allocation.inventoryStockId);
		if (!stock || stock.inventoryVariantId !== allocation.inventoryVariantId) {
			pushIssue(issues, seenIssues, issue("allocation-stock-mismatch"));
			continue;
		}
		const isCommitted = COMMITTED_STOCK_ALLOCATION_STATUSES.includes(
			allocation.status as CommittedStockAllocationStatus,
		);
		if (!isCommitted && allocation.status !== "pending_review") {
			pushIssue(issues, seenIssues, issue("allocation-quantity-invalid"));
			continue;
		}
		const quantitiesByStockId =
			allocation.status === "pending_review"
				? pendingReviewByStockId
				: committedByStockId;
		quantitiesByStockId.set(
			allocation.inventoryStockId,
			(quantitiesByStockId.get(allocation.inventoryStockId) || 0) +
				allocation.qty,
		);
	}
	if (issues.length) return { ok: false, issues, authority: null };

	const capacityByVariant = new Map<
		number,
		{
			physicalQty: number;
			committedQty: number;
			pendingReviewQty: number;
			availableQty: number;
		}
	>();
	for (const variantId of variantIds) {
		const variantStocks = stockByVariant.get(variantId) || [];
		const first = resolved.find((value) => value.variant.id === variantId);
		for (const stock of variantStocks) {
			const stockAvailableQty =
				stock.qty -
				(committedByStockId.get(stock.id) || 0) -
				(pendingReviewByStockId.get(stock.id) || 0);
			if (stockAvailableQty < -Number.EPSILON * 100) {
				pushIssue(
					issues,
					seenIssues,
					issue("stock-overcommitted", {
						lineUid: first?.requirement.lineUid,
						sourceUid: first?.requirement.sourceUid,
						inventoryUid: first?.requirement.inventoryUid,
						variantUid: first?.requirement.variantUid,
						inventoryStockId: stock.id,
						availableQty: stockAvailableQty,
					}),
				);
			}
		}
		const physicalQty = variantStocks.reduce(
			(sum, stock) => sum + stock.qty,
			0,
		);
		const committedQty = variantStocks.reduce(
			(sum, stock) => sum + (committedByStockId.get(stock.id) || 0),
			0,
		);
		const pendingReviewQty = variantStocks.reduce(
			(sum, stock) => sum + (pendingReviewByStockId.get(stock.id) || 0),
			0,
		);
		const availableQty = physicalQty - committedQty - pendingReviewQty;
		capacityByVariant.set(variantId, {
			physicalQty,
			committedQty,
			pendingReviewQty,
			availableQty,
		});
	}
	const requiredByVariant = new Map<number, number>();
	for (const value of resolved) {
		requiredByVariant.set(
			value.variant.id,
			(requiredByVariant.get(value.variant.id) || 0) + value.requirement.qty,
		);
	}
	for (const [variantId, requiredQty] of requiredByVariant) {
		const capacity = capacityByVariant.get(variantId);
		if (
			!capacity ||
			requiredQty > capacity.availableQty + Number.EPSILON * 100
		) {
			const first = resolved.find((value) => value.variant.id === variantId);
			pushIssue(
				issues,
				seenIssues,
				issue("stock-insufficient", {
					lineUid: first?.requirement.lineUid,
					sourceUid: first?.requirement.sourceUid,
					requiredQty,
					availableQty: capacity?.availableQty ?? 0,
				}),
			);
		}
	}
	if (issues.length) return { ok: false, issues, authority: null };

	const authorityRequirements = resolved
		.map((value) => {
			const capacity = capacityByVariant.get(value.variant.id);
			const inventory = value.inventory;
			return {
				lineUid: value.requirement.lineUid,
				sourceType: value.requirement.sourceType,
				sourceUid: value.requirement.sourceUid,
				inventoryUid: value.requirement.inventoryUid,
				variantUid: value.requirement.variantUid,
				categoryUid: value.requirement.categoryUid,
				requiredQty: value.requirement.qty,
				inventoryId: inventory.id,
				inventoryVariantId: value.variant.id,
				inventoryCategoryId: inventory.inventoryCategoryId,
				physicalQty: capacity?.physicalQty ?? 0,
				committedQty: capacity?.committedQty ?? 0,
				pendingReviewQty: capacity?.pendingReviewQty ?? 0,
				availableQty: capacity?.availableQty ?? 0,
			};
		})
		.sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
	const revision = authorityRevision({
		schemaVersion: SALES_REQUEST_STOCK_AUTHORITY_SCHEMA_VERSION,
		requirements: authorityRequirements,
		stocks: stocks
			.slice()
			.sort((left, right) => left.id - right.id)
			.map((stock) => ({
				id: stock.id,
				inventoryVariantId: stock.inventoryVariantId,
				qty: stock.qty,
			})),
		allocations: allocations
			.slice()
			.sort((left, right) => left.id - right.id)
			.map((allocation) => ({
				id: allocation.id,
				inventoryVariantId: allocation.inventoryVariantId,
				inventoryStockId: allocation.inventoryStockId,
				qty: allocation.qty,
				status: allocation.status,
			})),
	});

	return {
		ok: true,
		issues: [],
		authority: {
			schemaVersion: SALES_REQUEST_STOCK_AUTHORITY_SCHEMA_VERSION,
			revision,
			requirements: authorityRequirements,
		},
	};
}
