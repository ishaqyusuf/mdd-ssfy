export type SalesRequestGenerationPilotAccessState =
	| { status: "pending" | "error"; eligible?: false }
	| { status: "ready"; eligible: boolean };

export function canShowSalesRequestGenerationEntry(input: {
	mode: "create" | "edit";
	hasHistoryPreview: boolean;
	pilotAccess: SalesRequestGenerationPilotAccessState;
}) {
	return (
		input.mode === "create" &&
		!input.hasHistoryPreview &&
		input.pilotAccess.status === "ready" &&
		input.pilotAccess.eligible
	);
}

export function canOpenSalesRequestGeneration(input: {
	mode: "create" | "edit";
	pilotAccess: SalesRequestGenerationPilotAccessState;
	isSaving: boolean;
}) {
	return (
		input.mode === "create" &&
		!input.isSaving &&
		input.pilotAccess.status === "ready" &&
		input.pilotAccess.eligible
	);
}
