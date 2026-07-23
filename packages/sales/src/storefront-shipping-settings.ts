import { sortDoorSizesAsc } from "./sales-form/domain/workflow-calculators";

type ShippingStep = {
	uid?: string | null;
	title?: string | null;
	meta?: unknown;
	components?: Array<{ uid?: string | null; title?: string | null }> | null;
};

type ShelfCategory = {
	id: number;
	name?: string | null;
	type?: string | null;
	parentCategoryId?: number | null;
};

export type StorefrontCatalogFamily = "doors" | "mouldings" | "shelf-items";

export type CatalogShippingWeight = {
	weightPerUnitLb: number | null;
	lbPerLinearFoot: number | null;
	shelfCategoryId: number | null;
};

export function collectCanonicalDoorSizes(
	steps: ShippingStep[],
	pricingDependencyKeys: string[] = [],
) {
	const sizes = new Set<string>();
	const stepsByUid = new Map(
		steps.flatMap((step) => {
			const uid = String(step.uid || "").trim();
			return uid ? [[uid, step] as const] : [];
		}),
	);
	const heights = steps
		.filter(
			(step) =>
				String(step.title || "")
					.trim()
					.toLowerCase() === "height",
		)
		.flatMap((step) =>
			(step.components || []).flatMap((component) => {
				const title = String(component.title || "").trim();
				return title
					? [
							{
								stepUid: String(step.uid || "").trim(),
								componentUid: String(component.uid || "").trim(),
								title,
							},
						]
					: [];
			}),
		);

	for (const step of steps) {
		const meta = asRecord(step.meta);
		const variations = Array.isArray(meta.doorSizeVariation)
			? meta.doorSizeVariation
			: [];
		for (const variation of variations) {
			const variationRecord = asRecord(variation);
			const widthList = variationRecord.widthList;
			if (!Array.isArray(widthList)) continue;
			const rules = Array.isArray(variationRecord.rules)
				? variationRecord.rules
				: [];
			for (const height of heights) {
				const canOccur = rules.every((rule) =>
					isDoorSizeRuleSatisfiable({
						rule: asRecord(rule),
						height,
						stepsByUid,
					}),
				);
				if (!canOccur) continue;
				for (const value of widthList) {
					const width = String(value || "").trim();
					if (width) sizes.add(`${width} x ${height.title}`);
				}
			}
		}
	}

	for (const key of pricingDependencyKeys) {
		const size = String(key || "")
			.split(" & ")[0]
			?.trim();
		if (size?.includes(" x ")) sizes.add(size);
	}
	return Array.from(sizes).sort(sortDoorSizesAsc);
}

function isDoorSizeRuleSatisfiable({
	rule,
	height,
	stepsByUid,
}: {
	rule: Record<string, unknown>;
	height: { stepUid: string; componentUid: string };
	stepsByUid: Map<string, ShippingStep>;
}) {
	const stepUid = String(rule.stepUid || "").trim();
	const configuredUids = Array.isArray(rule.componentsUid)
		? rule.componentsUid.map((value) => String(value || "").trim())
		: [];
	if (!stepUid || !configuredUids.length) return true;
	const operator = String(rule.operator || "is");
	if (stepUid === height.stepUid && height.componentUid) {
		return operator === "isNot"
			? !configuredUids.includes(height.componentUid)
			: configuredUids.includes(height.componentUid);
	}
	const availableUids = (stepsByUid.get(stepUid)?.components || [])
		.map((component) => String(component.uid || "").trim())
		.filter(Boolean);
	return operator === "isNot"
		? availableUids.some((uid) => !configuredUids.includes(uid))
		: availableUids.some((uid) => configuredUids.includes(uid));
}

export function projectMainShelfCategories(categories: ShelfCategory[]) {
	return categories
		.filter((category) => category.type === "parent")
		.map((category) => ({
			id: category.id,
			name: String(category.name || "").trim(),
		}))
		.filter((category) => Boolean(category.name))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function readCatalogShippingWeight(
	metadata: unknown,
	family: StorefrontCatalogFamily,
): CatalogShippingWeight {
	const parsed = readCatalogShippingMetadata(metadata);
	return {
		weightPerUnitLb: family === "mouldings" ? null : parsed.weightPerUnitLb,
		lbPerLinearFoot: family === "mouldings" ? parsed.lbPerLinearFoot : null,
		shelfCategoryId: family === "shelf-items" ? parsed.shelfCategoryId : null,
	};
}

export function readCatalogShippingMetadata(
	metadata: unknown,
): CatalogShippingWeight {
	const shipping = asRecord(asRecord(metadata).shipping);
	return {
		weightPerUnitLb: positiveNumberOrNull(shipping.weightPerUnitLb),
		lbPerLinearFoot: positiveNumberOrNull(shipping.lbPerLinearFoot),
		shelfCategoryId: positiveIntegerOrNull(shipping.shelfCategoryId),
	};
}

function positiveNumberOrNull(value: unknown) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : null;
}

function positiveIntegerOrNull(value: unknown) {
	const number = Number(value);
	return Number.isInteger(number) && number > 0 ? number : null;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
