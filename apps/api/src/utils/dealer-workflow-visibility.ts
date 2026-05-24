type DealerShelfVisibilityMode = "all" | "allowlist";

export type DealerShelfCategoryVisibility = {
	mode: DealerShelfVisibilityMode;
	categoryIds: number[];
};

export type DealerWorkflowVisibility = {
	rootStepUid: string | null;
	visibleRootUids: Set<string>;
	allowedStepUids: Set<string>;
	shelfCategoryVisibility: DealerShelfCategoryVisibility;
};

type StepLookupInput = {
	stepId?: number | null;
	stepTitle?: string | null;
};

function toRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function toNumberArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value
		.map((entry) => Number(entry))
		.filter((entry) => Number.isInteger(entry) && entry > 0);
}

export function getDealerShelfCategoryVisibility(
	meta: unknown,
): DealerShelfCategoryVisibility {
	const settingsMeta = toRecord(meta);
	const nestedSettingsMeta = toRecord(settingsMeta.data);
	const rawVisibility = toRecord(
		Object.keys(toRecord(settingsMeta.dealerShelfCategoryVisibility)).length
			? settingsMeta.dealerShelfCategoryVisibility
			: nestedSettingsMeta.dealerShelfCategoryVisibility,
	);
	const mode =
		rawVisibility.mode === "allowlist" ? "allowlist" : ("all" as const);
	return {
		mode,
		categoryIds:
			mode === "allowlist" ? toNumberArray(rawVisibility.categoryIds) : [],
	};
}

export function deriveDealerWorkflowVisibility(
	routeData: Record<string, unknown>,
): DealerWorkflowVisibility {
	const composedRouter = toRecord(routeData.composedRouter);
	const visibleRootUids = new Set<string>();
	const allowedStepUids = new Set<string>();
	const rootStepUid =
		typeof routeData.rootStepUid === "string" ? routeData.rootStepUid : null;

	if (rootStepUid) {
		allowedStepUids.add(rootStepUid);
	}

	for (const [rootUid, routeDef] of Object.entries(composedRouter)) {
		const routeObj = toRecord(routeDef);
		const config = toRecord(routeObj.config);
		if (config.dealerVisible === false) continue;

		visibleRootUids.add(rootUid);
		allowedStepUids.add(rootUid);

		const routeSequence = Array.isArray(routeObj.routeSequence)
			? routeObj.routeSequence
			: [];
		for (const entry of routeSequence) {
			const uid = String(toRecord(entry).uid || "");
			if (uid) allowedStepUids.add(uid);
		}

		const route = toRecord(routeObj.route);
		for (const uid of Object.values(route)) {
			if (typeof uid === "string" && uid) allowedStepUids.add(uid);
		}
	}

	return {
		rootStepUid,
		visibleRootUids,
		allowedStepUids,
		shelfCategoryVisibility: getDealerShelfCategoryVisibility(
			routeData.settingsMeta,
		),
	};
}

export function resolveDealerWorkflowStepUid(
	routeData: Record<string, unknown>,
	input: StepLookupInput,
) {
	const stepsById = toRecord(routeData.stepsById);
	const stepsByUid = toRecord(routeData.stepsByUid);

	if (input.stepId != null) {
		const uid = stepsById[String(input.stepId)];
		return typeof uid === "string" ? uid : null;
	}

	const title = input.stepTitle?.trim().toLowerCase();
	if (!title) return null;

	const match = Object.entries(stepsByUid).find(([, value]) => {
		const step = toRecord(value);
		return typeof step.title === "string" && step.title.toLowerCase() === title;
	});
	return match?.[0] || null;
}

export function isDealerWorkflowStepAllowed(
	visibility: DealerWorkflowVisibility,
	stepUid: string | null,
) {
	return !!stepUid && visibility.allowedStepUids.has(stepUid);
}

export function isDealerRootComponentAllowed(
	visibility: DealerWorkflowVisibility,
	componentUid: unknown,
) {
	return (
		typeof componentUid === "string" &&
		visibility.visibleRootUids.has(componentUid)
	);
}

export function isDealerShelfCategoryAllowed(
	visibility: DealerWorkflowVisibility,
	category: { id?: number | null; parentCategoryId?: number | null },
) {
	const shelfVisibility = visibility.shelfCategoryVisibility;
	if (shelfVisibility.mode !== "allowlist") return true;
	const allowedIds = new Set(shelfVisibility.categoryIds);
	return (
		(typeof category.id === "number" && allowedIds.has(category.id)) ||
		(typeof category.parentCategoryId === "number" &&
			allowedIds.has(category.parentCategoryId))
	);
}

export function isDealerShelfProductAllowed(
	visibility: DealerWorkflowVisibility,
	product: { categoryId?: number | null; parentCategoryId?: number | null },
) {
	const shelfVisibility = visibility.shelfCategoryVisibility;
	if (shelfVisibility.mode !== "allowlist") return true;
	const allowedIds = new Set(shelfVisibility.categoryIds);
	return (
		(typeof product.categoryId === "number" &&
			allowedIds.has(product.categoryId)) ||
		(typeof product.parentCategoryId === "number" &&
			allowedIds.has(product.parentCategoryId))
	);
}
