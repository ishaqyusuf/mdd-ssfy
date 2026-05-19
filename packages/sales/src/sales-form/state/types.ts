import type {
	SalesFormExtraCostRecord,
	SalesFormLineItemRecord,
	SalesFormMetaRecord,
	SalesFormSummaryRecord,
} from "../application";

export type SalesFormSaveStatus =
	| "idle"
	| "saving"
	| "saved"
	| "error"
	| "stale";

export type SalesFormStepDisplayMode = "compact" | "extended";
export type SalesFormActiveItem = string | null;
export type SalesFormDoorViewMode = "selection" | "package";
export type SalesFormMouldingViewMode = "selection" | "lineItems";

export type SalesFormEditorState = {
	stepDisplayMode: SalesFormStepDisplayMode;
	activeItem: SalesFormActiveItem;
	doorViewMode: SalesFormDoorViewMode;
	mouldingViewMode: SalesFormMouldingViewMode;
	isOverviewOpen: boolean;
	showMobileSummary: boolean;
	autosaveEnabled: boolean;
};

export type SalesFormStateRecord = Record<string, any> & {
	form?: SalesFormMetaRecord | null;
	lineItems: SalesFormLineItemRecord[];
	extraCosts: SalesFormExtraCostRecord[];
	summary?: SalesFormSummaryRecord | null;
	settings?: {
		cccPercentage?: number | null;
	} | null;
	updatedAt?: string | null;
	version?: string | null;
};

export type SalesFormState<
	TRecord extends SalesFormStateRecord = SalesFormStateRecord,
> = {
	record: TRecord | null;
	dirty: boolean;
	lastSaveError: string | null;
	saveStatus: SalesFormSaveStatus;
	lastSavedAt: string | null;
	editor: SalesFormEditorState;
};

