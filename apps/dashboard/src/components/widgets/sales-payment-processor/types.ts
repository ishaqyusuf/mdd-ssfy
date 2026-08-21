import type { ButtonProps } from "@gnd/ui/button";
import type { ReactNode } from "react";

export interface SalesPaymentProcessorProps {
	selectedIds: number[];
	phoneNo: string;
	customerId?: number;
	children?: ReactNode;
	buttonProps?: ButtonProps;
	disabled?: boolean;
	onPaymentApplied?: () => void | Promise<void>;
}

export type PendingAppliedPaymentCheck = {
	salesIds: number[];
	startedAt: number;
};

export type PendingPrintRequest = {
	mode: string;
	salesIds: number[];
};

export type PaymentOverlayState =
	| "form"
	| "applying"
	| "creating"
	| "awaiting"
	| "recording"
	| "printing"
	| "success"
	| "print_failed"
	| "failed";
