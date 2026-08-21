import type { RouterOutputs } from "@gnd/api/trpc/routers/_app";

type SalesOverviewRouteData = NonNullable<
	RouterOutputs["sales"]["getSaleOverview"]
>;

type ProgressValue = {
	percentage?: number | null;
};

type StatusValue = {
	status?: string | null;
};

export type SalesOverviewData = SalesOverviewRouteData & {
	id: number;
	generalViewVersion?: "v1" | "v2";
	inventoryInboundOwnership?: unknown;
	stats?: {
		dispatchCompleted?: ProgressValue | null;
		prodCompleted?: ProgressValue | null;
	} | null;
	status?: {
		delivery?: StatusValue | null;
		production?: StatusValue | null;
	} | null;
};

export type GeneralV2AddressAction = (input: {
	addressId?: number | null;
	addressType: "billing" | "shipping";
	label: string;
}) => void;
