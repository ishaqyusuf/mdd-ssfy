import type {
	WorkflowComponentRecord,
	WorkflowLineItemRecord,
	WorkflowRouteData,
} from "@gnd/sales/sales-form";

export type WorkflowComponentPricingVariant = {
	path: string;
	titles: string[];
	current: boolean;
	id?: number;
	price: string;
};

type PricingVariantInput = {
	routeData: WorkflowRouteData | null;
	line: WorkflowLineItemRecord;
	component: WorkflowComponentRecord;
};

function objectRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function routeSteps(routeData: WorkflowRouteData | null) {
	const source = routeData?.steps?.length
		? routeData.steps
		: Object.values(routeData?.stepsByUid || {}).filter(Boolean);
	return source.flatMap((step) => {
		const uid = String(step?.uid || "");
		if (!uid) return [];
		const components = Array.isArray(step?.components)
			? (step.components as WorkflowComponentRecord[])
			: [];
		return [{ uid, components }];
	});
}

function selectedComponentUids(line: WorkflowLineItemRecord) {
	const result = new Set<string>();
	for (const step of line.formSteps || []) {
		if (step?.prodUid) result.add(String(step.prodUid));
		const selected = Array.isArray(step?.meta?.selectedProdUids)
			? step.meta.selectedProdUids
			: [];
		for (const uid of selected) result.add(String(uid));
	}
	return result;
}

function cartesian<T>(groups: T[][], limit = 120): T[][] {
	let combinations: T[][] = [[]];
	for (const group of groups) {
		const next: T[][] = [];
		for (const prefix of combinations) {
			for (const value of group) {
				next.push([...prefix, value]);
				if (next.length >= limit) break;
			}
			if (next.length >= limit) break;
		}
		combinations = next;
	}
	return combinations;
}

export function buildWorkflowComponentPricingVariants(
	input: PricingVariantInput,
) {
	const component = input.component;
	const componentUid = String(component.uid || "");
	const pricing = objectRecord(component.pricing);
	const dependencies = Array.isArray(component.priceStepDeps)
		? component.priceStepDeps.map(String).filter(Boolean)
		: [];
	const selected = selectedComponentUids(input.line);
	if (!dependencies.length) {
		const row = objectRecord(pricing[componentUid]);
		return [
			{
				path: componentUid,
				titles: ["Default Price"],
				current: true,
				id: Number(row.id || 0) || undefined,
				price: row.price == null ? "" : String(row.price),
			},
		] satisfies WorkflowComponentPricingVariant[];
	}
	const steps = routeSteps(input.routeData);
	const groups = dependencies.map((stepUid) => {
		const step = steps.find((candidate) => candidate.uid === stepUid);
		return (step?.components || []).flatMap((candidate) => {
			const uid = String(candidate.uid || "");
			return uid ? [{ uid, title: String(candidate.title || uid) }] : [];
		});
	});
	if (groups.some((group) => !group.length)) return [];
	return cartesian(groups).map((combination) => {
		const path = combination.map((entry) => entry.uid).join("-");
		const row = objectRecord(pricing[path]);
		return {
			path,
			titles: combination.map((entry) => entry.title),
			current: combination.every((entry) => selected.has(entry.uid)),
			id: Number(row.id || 0) || undefined,
			price: row.price == null ? "" : String(row.price),
		};
	});
}
