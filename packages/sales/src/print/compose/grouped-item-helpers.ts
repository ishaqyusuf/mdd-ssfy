import type { PrintSalesItem } from "../query";

type PrintFormStep = PrintSalesItem["formSteps"][number];
type PrintDoor = NonNullable<
	PrintSalesItem["housePackageTool"]
>["doors"][number];

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function normalizeTitle(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function getNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function getRevisionTime(value: { updatedAt?: Date | string | null }) {
	const time = value.updatedAt ? new Date(value.updatedAt).getTime() : 0;
	return Number.isFinite(time) ? time : 0;
}

function getRevisionId(value: { id?: number | null }) {
	return getNumber(value.id) ?? 0;
}

function isNewerRevision(
	candidate: { id?: number | null; updatedAt?: Date | string | null },
	current: { id?: number | null; updatedAt?: Date | string | null },
) {
	const timeDifference = getRevisionTime(candidate) - getRevisionTime(current);
	return (
		timeDifference > 0 ||
		(timeDifference === 0 && getRevisionId(candidate) > getRevisionId(current))
	);
}

export function getLatestFormSteps(
	item: PrintSalesItem,
	options: { requireSingleRevision?: boolean } = {},
): PrintFormStep[] {
	const latestByStep = new Map<
		string,
		{ index: number; step: PrintFormStep }
	>();

	for (const [index, step] of (item.formSteps || []).entries()) {
		const stepIdentity =
			getNumber(step.stepId) ??
			getNumber(step.step?.id) ??
			normalizeTitle(step.step?.title);
		const key = stepIdentity
			? String(stepIdentity)
			: `form-step:${String(step.id)}`;
		const current = latestByStep.get(key);
		if (
			current &&
			options.requireSingleRevision &&
			formStepRevisionSignature(step) !==
				formStepRevisionSignature(current.step)
		) {
			throw new Error(
				`Sales item ${item.id} form-step revisions do not reconcile. Save or repair this sale before printing.`,
			);
		}

		if (!current || isNewerRevision(step, current.step)) {
			latestByStep.set(key, { index, step });
		}
	}

	return [...latestByStep.values()]
		.sort((left, right) => left.index - right.index)
		.map(({ step }) => step);
}

function formStepRevisionSignature(step: PrintFormStep) {
	return JSON.stringify({
		componentId: getNumber(step.componentId),
		prodUid: String(step.prodUid || "").trim(),
		value: String(step.value || "").trim(),
	});
}

function getDoorQuantity(door: PrintDoor) {
	const totalQty = getNumber(door.totalQty);
	if (totalQty !== null && totalQty > 0) return totalQty;

	return (getNumber(door.lhQty) ?? 0) + (getNumber(door.rhQty) ?? 0);
}

function getDoorTotalCents(door: PrintDoor) {
	const lineTotal = getNumber(door.lineTotal);
	if (lineTotal !== null) return Math.round(lineTotal * 100);

	const unitPrice = getNumber(door.unitPrice);
	return unitPrice === null
		? null
		: Math.round(unitPrice * getDoorQuantity(door) * 100);
}

/**
 * Older sales-form saves can leave prior HPT door generations active. Recover
 * only when the newest rows reconcile exactly to the persisted item quantity
 * and total; otherwise preserve every row rather than guessing.
 */
export function getCurrentHousePackageDoors(
	item: PrintSalesItem,
	options: { requireReconciliation?: boolean } = {},
): PrintDoor[] {
	const doors = item.housePackageTool?.doors || [];
	const targetQty = getNumber(item.qty);
	const targetTotal = getNumber(item.total);

	if (!doors.length) return doors;
	if (targetQty === null || targetTotal === null) {
		if (options.requireReconciliation) {
			throwUnreconciledDoorRows(item);
		}
		return doors;
	}

	const targetTotalCents = Math.round(targetTotal * 100);
	const allQty = doors.reduce(
		(total, door) => total + getDoorQuantity(door),
		0,
	);
	const allTotalCents = doors.reduce<number | null>((total, door) => {
		const doorTotal = getDoorTotalCents(door);
		return total === null || doorTotal === null ? null : total + doorTotal;
	}, 0);

	if (allQty === targetQty && allTotalCents === targetTotalCents) {
		return doors;
	}

	const newestFirst = doors
		.map((door, index) => ({ door, index }))
		.sort((left, right) => {
			const timeDifference =
				getRevisionTime(right.door) - getRevisionTime(left.door);
			return (
				timeDifference || getRevisionId(right.door) - getRevisionId(left.door)
			);
		});
	const selected: Array<{ door: PrintDoor; index: number }> = [];
	let selectedQty = 0;
	let selectedTotalCents = 0;

	for (const candidate of newestFirst) {
		const doorTotalCents = getDoorTotalCents(candidate.door);
		if (doorTotalCents === null) {
			if (options.requireReconciliation) {
				throwUnreconciledDoorRows(item);
			}
			return doors;
		}

		selected.push(candidate);
		selectedQty += getDoorQuantity(candidate.door);
		selectedTotalCents += doorTotalCents;

		if (selectedQty === targetQty && selectedTotalCents === targetTotalCents) {
			return selected
				.sort((left, right) => left.index - right.index)
				.map(({ door }) => door);
		}

		if (selectedQty > targetQty || selectedTotalCents > targetTotalCents) {
			if (options.requireReconciliation) {
				throwUnreconciledDoorRows(item);
			}
			return doors;
		}
	}

	if (options.requireReconciliation) {
		throwUnreconciledDoorRows(item);
	}
	return doors;
}

function throwUnreconciledDoorRows(item: PrintSalesItem): never {
	throw new Error(
		`Sales item ${item.id} door rows do not reconcile with its saved quantity and total. Save or repair this sale before printing.`,
	);
}

function findStep(item: PrintSalesItem, title: string) {
	const expected = normalizeTitle(title);
	return getLatestFormSteps(item).find(
		(step) => normalizeTitle(step?.step?.title) === expected,
	);
}

export function getPersistedItemMeta(item: PrintSalesItem) {
	const meta = safeRecord(item.meta);
	const nested = safeRecord(meta.meta);
	return Object.keys(nested).length ? nested : meta;
}

export function getSalesItemType(item: PrintSalesItem) {
	const meta = getPersistedItemMeta(item);
	const metaDoorType = String(meta.doorType || "").trim();
	if (metaDoorType) return metaDoorType;

	const hptDoorType = String(item.housePackageTool?.doorType || "").trim();
	if (hptDoorType) return hptDoorType;

	return String(findStep(item, "Item Type")?.value || "").trim();
}

export function getSectionIndex(item: PrintSalesItem, fallbackIndex: number) {
	const meta = getPersistedItemMeta(item);
	return (
		getNumber(meta.itemIndex) ??
		getNumber(meta.item_index) ??
		getNumber(safeRecord(item.meta).itemIndex) ??
		getNumber(safeRecord(item.meta).item_index) ??
		getNumber(meta.lineIndex) ??
		getNumber(meta.line_index) ??
		getNumber(safeRecord(item.meta).lineIndex) ??
		getNumber(safeRecord(item.meta).line_index) ??
		fallbackIndex
	);
}

export function getLegacyUid(item: PrintSalesItem, fallbackIndex: number) {
	const meta = safeRecord(item.meta);
	return (
		getNumber(meta.uid) ??
		getNumber(getPersistedItemMeta(item).uid) ??
		getSectionIndex(item, fallbackIndex)
	);
}

export function getMetaRows<T = Record<string, unknown>>(
	item: PrintSalesItem,
	key: "mouldingRows" | "serviceRows",
) {
	const meta = getPersistedItemMeta(item) as Record<string, unknown>;
	return Array.isArray(meta[key]) ? (meta[key] as T[]) : [];
}

export function isMetadataBackedMouldingItem(item: PrintSalesItem) {
	const type = normalizeTitle(getSalesItemType(item));
	return (
		(type === "moulding" ||
			type === "mouldings" ||
			type === "molding" ||
			type === "moldings") &&
		getMetaRows(item, "mouldingRows").length > 0
	);
}

export function isMetadataBackedServiceItem(item: PrintSalesItem) {
	const type = normalizeTitle(getSalesItemType(item));
	return (
		!item.housePackageTool &&
		(type === "service" || type === "services") &&
		getMetaRows(item, "serviceRows").length > 0
	);
}

export function suppressMetadataBackedGroupSiblings(
	items: PrintSalesItem[],
): PrintSalesItem[] {
	const authoritativeItems = new Map<string, PrintSalesItem>();

	for (const item of items) {
		const groupUid = String(item.multiDykeUid || "").trim();
		if (!groupUid) continue;
		if (
			!isMetadataBackedMouldingItem(item) &&
			!isMetadataBackedServiceItem(item)
		) {
			continue;
		}

		const current = authoritativeItems.get(groupUid);
		if (!current || (item.multiDyke && !current.multiDyke)) {
			authoritativeItems.set(groupUid, item);
		}
	}

	if (!authoritativeItems.size) return items;

	return items.filter((item) => {
		const groupUid = String(item.multiDykeUid || "").trim();
		const authoritativeItem = authoritativeItems.get(groupUid);
		return !authoritativeItem || authoritativeItem.id === item.id;
	});
}

export function findSelectedStepComponent(
	item: PrintSalesItem,
	title: string,
	rowUid?: string | null,
) {
	const stepMeta = safeRecord(findStep(item, title)?.meta);
	const selectedComponents = Array.isArray(stepMeta.selectedComponents)
		? (stepMeta.selectedComponents as Array<Record<string, unknown>>)
		: [];

	if (!selectedComponents.length) return null;

	if (rowUid) {
		const matched = selectedComponents.find(
			(component) => String(component?.uid || "") === String(rowUid),
		);
		if (matched) return matched;
	}

	return selectedComponents[0] || null;
}
