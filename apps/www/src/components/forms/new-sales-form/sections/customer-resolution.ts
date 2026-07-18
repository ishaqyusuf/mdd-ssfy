export type InitialCustomerResolutionInput = {
	mode: "create" | "edit";
	initialCustomerId?: number | null;
	currentCustomerId?: number | null;
	resolvedCustomerId?: number | null;
	initialResolutionHandled: boolean;
};

export function shouldPreserveInitialEditCustomerResolution(
	input: InitialCustomerResolutionInput,
) {
	return (
		input.mode === "edit" &&
		!input.initialResolutionHandled &&
		input.initialCustomerId != null &&
		input.currentCustomerId === input.initialCustomerId &&
		input.resolvedCustomerId === input.initialCustomerId
	);
}

export function shouldPreserveInitialEditTaxRate(input: {
	mode: "create" | "edit";
	initialTaxCode?: string | null;
	currentTaxCode?: string | null;
}) {
	return (
		input.mode === "edit" &&
		input.initialTaxCode !== undefined &&
		input.currentTaxCode === input.initialTaxCode
	);
}
