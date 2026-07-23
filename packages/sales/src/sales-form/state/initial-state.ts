import type { SalesFormEditorState, SalesFormState } from "./types";

export const initialSalesFormEditorState: SalesFormEditorState = {
	stepDisplayMode: "extended",
	activeItem: null,
	activeStepByLine: {},
	doorViewMode: "selection",
	mouldingViewMode: "selection",
	isOverviewOpen: false,
	showMobileSummary: false,
	// Keep draft protection enabled by default; users can still opt out from
	// the editor actions when they need manual-save behavior.
	autosaveEnabled: true,
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
