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

const WORKER_QUANTITY_SUBTITLE_SEGMENT =
	/^(?:QTY\s*:?\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*LH(?:\s*&\s*\d+(?:\.\d+)?\s*RH)?|\d+(?:\.\d+)?\s*RH)$/i;

function uppercaseText(value: string | null | undefined) {
	return value?.trim().toUpperCase() || "";
}

export function getProductionItemPresentation(
	item: ProductionItemPresentationInput,
) {
	return {
		title: uppercaseText(item.title) || "UNTITLED ITEM",
		subtitle: uppercaseText(item.subtitle),
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
		subtitle: presentation.subtitle
			.split("|")
			.map((segment) => segment.trim())
			.filter(
				(segment) => segment && !WORKER_QUANTITY_SUBTITLE_SEGMENT.test(segment),
			)
			.join(" | "),
	};
}

export function getProductionConfigKey(
	config: ProductionConfigKeyInput,
	index: number,
) {
	return `${config.label ?? "detail"}-${config.value ?? ""}-${index}`;
}
