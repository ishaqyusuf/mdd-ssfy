type WorkflowComponentPrice = {
	basePrice?: number | string | null;
	salesPrice?: number | string | null;
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
