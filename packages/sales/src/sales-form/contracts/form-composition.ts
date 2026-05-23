import type { ReactNode } from "react";
import type { SalesFormCapabilities } from "./form-capabilities";
import type { SalesFormPermissions } from "./form-permissions";
import type { SalesFormSlots } from "./form-slots";

export type SalesFormDataSources = Record<string, unknown>;

export type SalesFormActions = Record<string, unknown>;

export type SalesFormComposition = {
	mode: "create" | "edit";
	type: "order" | "quote";
	record?: unknown;
	state?: unknown;
	data?: SalesFormDataSources;
	actions?: SalesFormActions;
	orderId?: string | null;
	grandTotal?: number | null;
	isSaved?: boolean;
	isSaving?: boolean;
	mobileSummaryOpen?: boolean;
	surface?: "fixed" | "embedded";
	showMobileFooter?: boolean;
	mobileSaveLabel?: string;
	capabilities: SalesFormCapabilities;
	permissions: SalesFormPermissions;
	slots?: SalesFormSlots;
	onCloseSummary?: () => void;
	onOpenSummary?: () => void;
	onSaveDraft?: () => Promise<void> | void;
	onSaveClose?: () => Promise<void> | void;
	onSaveNew?: () => Promise<void> | void;
	onSaveFinal?: () => Promise<void> | void;
	children?: ReactNode;
};
