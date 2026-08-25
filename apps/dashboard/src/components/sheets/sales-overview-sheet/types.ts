"use client";

import type { RouterOutputs } from "@gnd/api/trpc/routers/_app";
import type { ReactNode } from "react";

export type SalesOverviewVersionedData = NonNullable<
	RouterOutputs["sales"]["getSaleOverview"]
> & {
	generalViewVersion?: "v1" | "v2";
};

export type LegacySalesOverviewMode =
	| "default"
	| "assigned-production"
	| "dispatch-modal";

export type LegacySalesOverviewTabId =
	| "general"
	| "production"
	| "production-notes"
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
