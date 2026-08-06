type WorkflowComponentPrice = {
	basePrice?: number | string | null;
	salesPrice?: number | string | null;
	pricing?: Record<string, unknown> | null;
};

export function hasVisibleWorkflowComponentPrice(
	components: WorkflowComponentPrice[],
) {
	return components.some((component) =>
		[component.salesPrice, component.basePrice].some((price) => {
			const value = Number(price);
			return Number.isFinite(value) && value > 0;
		}),
	);
}

export function supportsWorkflowComponentPrice(
	components: WorkflowComponentPrice[],
) {
	return components.some(
		(component) =>
			component.salesPrice != null ||
			component.basePrice != null ||
			Boolean(component.pricing && Object.keys(component.pricing).length > 0),
	);
}
