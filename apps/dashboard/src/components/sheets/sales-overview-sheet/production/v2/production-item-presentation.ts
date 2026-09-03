import { getProductionItemHeadlineSegments } from "@/components/production-v2/production-item-headline";

type ProductionItemPresentationInput = {
	title?: string | null;
	subtitle?: string | null;
};

type ProductionConfigKeyInput = {
	label?: string | null;
	value?: string | null;
};

type ProductionAssignedQuantityInput = {
	lh?: number | null;
	qty?: number | null;
	rh?: number | null;
};

function uppercaseText(value: string | null | undefined) {
	return value?.trim().toUpperCase() || "";
}

export function getProductionItemPresentation(
	item: ProductionItemPresentationInput,
) {
	return {
		title: uppercaseText(item.title) || "UNTITLED ITEM",
		subtitle: uppercaseText(item.subtitle),
		headlineSegments: getProductionItemHeadlineSegments(item),
	};
}

export function getWorkerProductionItemPresentation(
	item: ProductionItemPresentationInput,
	assignedQuantity?: ProductionAssignedQuantityInput | null,
) {
	const presentation = getProductionItemPresentation(item);
	const lh = Math.max(Number(assignedQuantity?.lh || 0), 0);
	const rh = Math.max(Number(assignedQuantity?.rh || 0), 0);
	const qty = Math.max(Number(assignedQuantity?.qty || 0), 0);

	return {
		...presentation,
		assignedQuantity: {
			lh,
			qty: qty || lh + rh,
			rh,
		},
		subtitle: getProductionItemHeadlineSegments(item, {
			omitQuantitySegments: true,
		})
			.slice(1)
			.join(" | "),
		headlineSegments: getProductionItemHeadlineSegments(item, {
			omitQuantitySegments: true,
		}),
	};
}

export function getProductionConfigKey(
	config: ProductionConfigKeyInput,
	index: number,
) {
	return `${config.label ?? "detail"}-${config.value ?? ""}-${index}`;
}
