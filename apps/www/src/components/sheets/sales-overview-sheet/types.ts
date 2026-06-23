"use client";

import type { ReactNode } from "react";

export type LegacySalesOverviewMode =
	| "default"
	| "assigned-production"
	| "dispatch-modal";

export type LegacySalesOverviewTabId =
	| "general"
	| "production"
	| "production-notes"
	| "dispatch-notes"
	| "transactions"
	| "activity"
	| "inbound"
	| "inventory"
	| "dispatch"
	| "packing";

export type LegacySalesOverviewTabDefinition = {
	value: LegacySalesOverviewTabId;
	label: string;
	disabled?: boolean;
	hidden?: boolean;
	badge?: ReactNode;
	content?: ReactNode;
};
