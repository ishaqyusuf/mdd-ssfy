import type { SalesFormEditorState, SalesFormState } from "./types";

export const initialSalesFormEditorState: SalesFormEditorState = {
	stepDisplayMode: "extended",
	activeItem: null,
	activeStepByLine: {},
	doorViewMode: "selection",
	mouldingViewMode: "selection",
	isOverviewOpen: false,
	showMobileSummary: false,
	autosaveEnabled: false,
};

export function createInitialSalesFormState(): SalesFormState {
	return {
		record: null,
		dirty: false,
		lastSaveError: null,
		saveStatus: "idle",
		lastSavedAt: null,
		editor: initialSalesFormEditorState,
	};
}
