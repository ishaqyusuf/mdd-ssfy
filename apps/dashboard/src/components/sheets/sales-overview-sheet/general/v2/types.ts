import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import type { SalesOverviewVersionedData } from "../../types";

type ProgressValue = {
	percentage?: number | null;
};

type StatusValue = {
	status?: string | null;
};

export type SalesOverviewData = SalesOverviewVersionedData & {
	id: number;
	pipeline?: SalesPipelineSnapshot | null;
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
