import type { ReactNode } from "react";

export type SalesFormSlots = {
	CustomerSelectorDialog?: ReactNode;
	PaymentMethodReviewDialog?: ReactNode;
	SalesHistoryPanel?: ReactNode;
	PaymentAction?: ReactNode;
	PrintAction?: ReactNode;
	SettingsAction?: ReactNode;
	PackingActions?: ReactNode;
	RecoveryBanner?: ReactNode;
	MainPanel?: ReactNode;
	SummaryPanel?: ReactNode;
	SummaryFooterActions?: ReactNode;
	GrandTotalValue?: ReactNode;
	FloatingActions?: ReactNode;
};
