import type { ReactNode } from "react";
import type { SalesFormCapabilities } from "./form-capabilities";
import type { SalesFormPermissions } from "./form-permissions";
import type { SalesFormSlots } from "./form-slots";

export type SalesFormComposition = {
	mode: "create" | "edit";
	type: "order" | "quote";
	orderId?: string | null;
	grandTotal?: number | null;
	isSaved?: boolean;
	isSaving?: boolean;
	mobileSummaryOpen?: boolean;
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
