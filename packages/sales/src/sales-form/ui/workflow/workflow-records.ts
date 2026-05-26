import {
	isWorkflowRedirectDisabledStep,
	normalizeSalesFormTitle as normalizeTitle,
	resolveInitialWorkflowStepIndex as resolveInitialStepIndex,
	resolveInteractiveWorkflowStepIndex,
} from "../../domain/step-engine";

export type WorkflowStepRecord = {
	id?: number | null;
	uid?: string | null;
	stepId?: number | null;
	componentId?: number | null;
	prodUid?: string | null;
	title?: string | null;
	value?: string | null;
	price?: number | null;
	basePrice?: number | null;
	step?: {
		id?: number | null;
		uid?: string | null;
		title?: string | null;
		[key: string]: unknown;
	} | null;
	meta?: {
		redirectDisabled?: boolean | null;
		redirectTargetUid?: string | null;
		redirectUid?: string | null;
		priceStepDeps?: string[] | null;
		selectedProdUids?: string[] | null;
		selectedComponents?: WorkflowComponentRecord[] | null;
		sectionOverride?: WorkflowComponentRecord["sectionOverride"] | null;
		[key: string]: unknown;
	} | null;
	[key: string]: unknown;
};

export type WorkflowComponentRecord = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	salesPrice?: number | null;
	basePrice?: number | null;
	redirectUid?: string | null;
	sectionOverride?: {
		overrideMode?: boolean;
		noHandle?: boolean;
		hasSwing?: boolean;
	} | null;
	isDeleted?: boolean;
	custom?: boolean;
	_metaData?: {
		custom?: boolean;
	} | null;
	[key: string]: unknown;
};

export type WorkflowRouteStepRecord = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	meta?: Record<string, unknown> | null;
	[key: string]: unknown;
};

export type WorkflowRouteData = {
	rootStepUid?: string | null;
	steps?: WorkflowRouteStepRecord[] | null;
	stepsByUid?: Record<string, WorkflowRouteStepRecord | undefined> | null;
	stepsById?: Record<string | number, string | undefined> | null;
	composedRouter?: Record<
		string,
		| {
				steps?: string[] | null;
				config?: unknown;
				[key: string]: unknown;
		  }
		| undefined
	> | null;
	[key: string]: unknown;
};

export type WorkflowHousePackageToolRecord = {
	id?: number | null;
	doors?: DoorStoredRow[] | null;
	totalDoors?: number | null;
	totalPrice?: number | null;
	[key: string]: unknown;
};

export type WorkflowLineItemRecord = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	meta?: Record<string, unknown> | null;
	formSteps?: WorkflowStepRecord[] | null;
	shelfItems?: ShelfItemRow[] | null;
	housePackageTool?: WorkflowHousePackageToolRecord | null;
	[key: string]: unknown;
};

export type ShelfItemRow = {
	categoryId?: number | null;
	meta?: {
		shelfParentCategoryId?: number | null;
		categoryIds?: number[];
		[key: string]: unknown;
	} | null;
	[key: string]: unknown;
};

export type ShelfProductRecord = {
	categoryId?: number | null;
	parentCategoryId?: number | null;
	[key: string]: unknown;
};

export type ShelfCategoryRecord = {
	type?: string | null;
	[key: string]: unknown;
};

export type DoorStoredRow = {
	stepProductId?: number | null;
	dimension?: string | null;
	swing?: string | null;
	lhQty?: number | null;
	rhQty?: number | null;
	totalQty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	addon?: number | string | null;
	customPrice?: number | string | null;
	meta?: {
		baseUnitPrice?: number | null;
		priceMissing?: boolean | null;
		[key: string]: unknown;
	} | null;
	[key: string]: unknown;
};

export type MouldingRow = {
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	description?: string | null;
	qty?: number | null;
	addon?: number | null;
	customPrice?: number | string | null;
	salesPrice?: number | null;
	basePrice?: number | null;
	estimateUnit?: number | null;
	lineTotal?: number | null;
	[key: string]: unknown;
};

export type ServiceRow = {
	uid?: string | null;
	service?: string | null;
	taxxable?: boolean | null;
	produceable?: boolean | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	[key: string]: unknown;
};

export type ShelfRowDraft = {
	uid: string;
	id: number | null;
	categoryId: number | null;
	productId: number | null;
	description: string;
	qty: number;
	unitPrice: number;
	totalPrice: number;
	basePrice?: number;
	salesPrice?: number;
	customPrice?: number | null;
	meta?: {
		categoryIds?: number[];
		shelfParentCategoryId?: number | null;
		basePrice?: number;
		salesPrice?: number;
		customPrice?: number | null;
		unitPrice?: number;
		[key: string]: unknown;
	};
	[key: string]: unknown;
};

export type ShelfSectionDraft = {
	uid: string;
	categoryIds: number[];
	parentCategoryId: number | null;
	categoryId: number | null;
	rows: ShelfRowDraft[];
	subTotal: number;
	[key: string]: unknown;
};

export type ShelfProductOption = ShelfProductRecord & {
	id?: number | null;
	title?: string | null;
	unitPrice?: number | null;
	img?: string | null;
};

export type CustomerProfileRecord = {
	id?: number | null;
	coefficient?: number | null;
};

export function stepKey(lineUid: string, stepIndex: number) {
	return `${lineUid}:${stepIndex}`;
}

export function createShelfProductDraft(): ShelfRowDraft {
	return {
		uid: shelfUid("shelf-product"),
		id: null,
		categoryId: null,
		productId: null,
		description: "",
		qty: 1,
		unitPrice: 0,
		totalPrice: 0,
		meta: {},
	};
}

export function createShelfSectionDraft(): ShelfSectionDraft {
	return {
		uid: shelfUid("shelf-section"),
		categoryIds: [],
		parentCategoryId: null,
		categoryId: null,
		rows: [createShelfProductDraft()],
		subTotal: 0,
	};
}

export function isMultiSelectStepTitle(title?: string | null) {
	return new Set(["door", "moulding", "weatherstrip color"]).has(
		normalizeTitle(title),
	);
}

export function isDoorStepTitle(title?: string | null) {
	return normalizeTitle(title) === "door";
}

export function isHousePackageToolStepTitle(title?: string | null) {
	const normalized = normalizeTitle(title);
	return normalized === "house package tool" || normalized === "hpt";
}

export function firstFiniteNumber(...values: Array<number | null | undefined>) {
	for (const value of values) {
		const candidate = Number(value);
		if (Number.isFinite(candidate)) return candidate;
	}
	return null;
}

export function firstPendingStepIndex(steps: WorkflowStepRecord[]) {
	const pending = steps.findIndex(
		(step) => !String(step?.prodUid || "").trim(),
	);
	return pending >= 0 ? pending : Math.max(0, steps.length - 1);
}

export function isRedirectDisabledStep(step: WorkflowStepRecord) {
	return isWorkflowRedirectDisabledStep(step);
}

export function resolveInteractiveStepIndex(
	steps: WorkflowStepRecord[],
	preferredIndex: number,
) {
	return resolveInteractiveWorkflowStepIndex(steps, preferredIndex);
}

export function resolveInitialWorkflowStepIndex(steps: WorkflowStepRecord[]) {
	return resolveInitialStepIndex(steps);
}

export function componentLabel(value?: string | null) {
	return String(value || "")
		.trim()
		.toUpperCase();
}

export function getWorkflowSteps(line?: WorkflowLineItemRecord | null) {
	return (
		Array.isArray(line?.formSteps) ? line.formSteps : []
	) as WorkflowStepRecord[];
}

export function lineItemPickerLabel(
	line: WorkflowLineItemRecord,
	index: number,
) {
	const explicitTitle = String(line?.title || "").trim();
	if (explicitTitle) return explicitTitle;
	const placeholder = getLineTitlePlaceholder(line);
	if (placeholder) return placeholder;
	const itemTypeStep = getWorkflowSteps(line).find(
		(step) => normalizeTitle(step?.step?.title) === "item type",
	);
	const itemTypeLabel = String(
		itemTypeStep?.value || itemTypeStep?.title || itemTypeStep?.prodUid || "",
	).trim();
	return itemTypeLabel
		? `Item ${index + 1} (${itemTypeLabel})`
		: `Item ${index + 1}`;
}

export function getLineTitlePlaceholder(line: WorkflowLineItemRecord) {
	const explicitTitle = String(line?.title || "").trim();
	if (explicitTitle) return explicitTitle;
	const itemTypeStep = getWorkflowSteps(line).find(
		(step) => normalizeTitle(step?.step?.title) === "item type",
	);
	const itemTypeLabel = String(
		itemTypeStep?.value ||
			itemTypeStep?.step?.title ||
			itemTypeStep?.prodUid ||
			"",
	).trim();
	if (itemTypeLabel) return itemTypeLabel;
	const firstSelectedStep = getWorkflowSteps(line).find((step) =>
		String(step?.value || "").trim(),
	);
	return String(
		firstSelectedStep?.value ||
			firstSelectedStep?.step?.title ||
			firstSelectedStep?.prodUid ||
			"",
	).trim();
}

export function getStoredMouldingRows(line: WorkflowLineItemRecord) {
	const meta = line.meta as WorkflowLineItemRecord["meta"] & {
		mouldingRows?: MouldingRow[];
	};
	return Array.isArray(meta?.mouldingRows) ? meta.mouldingRows : [];
}

export function getStoredServiceRows(line: WorkflowLineItemRecord) {
	const meta = line.meta as WorkflowLineItemRecord["meta"] & {
		serviceRows?: ServiceRow[];
	};
	return Array.isArray(meta?.serviceRows) ? meta.serviceRows : [];
}

export function isComponentEnabledForView(
	component: WorkflowComponentRecord,
	includeCustom: boolean,
) {
	if (includeCustom) return true;
	return !component?._metaData?.custom && !component?.custom;
}

export function getStepPriceDeps(step?: WorkflowStepRecord | null) {
	return Array.isArray(step?.meta?.priceStepDeps)
		? step.meta.priceStepDeps
		: null;
}

export function buildStepComponentOverrideMap(
	step?: WorkflowStepRecord | null,
) {
	const overrides = new Map<string, WorkflowComponentRecord>();
	const selected = Array.isArray(step?.meta?.selectedComponents)
		? step.meta.selectedComponents
		: [];
	for (const component of selected) {
		const uid = String(component?.uid || "").trim();
		if (!uid) continue;
		overrides.set(uid, component);
	}
	if (String(step?.prodUid || "").trim()) {
		const uid = String(step?.prodUid || "").trim();
		if (!overrides.has(uid)) {
			overrides.set(uid, {
				uid,
				title: step?.value || null,
				salesPrice: step?.price ?? null,
				basePrice: step?.basePrice ?? null,
				redirectUid: step?.meta?.redirectUid || null,
				sectionOverride: step?.meta?.sectionOverride || null,
			});
		}
	}
	return overrides;
}

function shelfUid(prefix: string) {
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
