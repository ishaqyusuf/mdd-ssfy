type ProductionItemPresentationInput = {
	title?: string | null;
	subtitle?: string | null;
};

type ProductionConfigKeyInput = {
	label?: string | null;
	value?: string | null;
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
	};
}

export function getProductionConfigKey(
	config: ProductionConfigKeyInput,
	index: number,
) {
	return `${config.label ?? "detail"}-${config.value ?? ""}-${index}`;
}
