import type { PrintMode } from "@gnd/sales/print/types";
import type { ButtonProps } from "@gnd/ui/button";
import type { ReactNode } from "react";

export interface SalesPaymentProcessorProps {
	selectedIds: number[];
	phoneNo: string;
	customerId?: number;
	children?: ReactNode;
	buttonProps?: ButtonProps;
	disabled?: boolean;
}

export type PendingAppliedPaymentCheck = {
	salesIds: number[];
	startedAt: number;
};

export type PendingPrintRequest = {
	mode: PrintMode;
	salesIds: number[];
	windowRef: Window | null;
};

export type PaymentOverlayState =
	| "form"
	| "applying"
	| "creating"
	| "awaiting"
	| "recording"
	| "success"
	| "failed";
