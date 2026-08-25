import { dispatchWorkspaceStages } from "@gnd/sales/dispatch-manifest/status";
import {
	dispatchRiskCodes,
	dispatchWorkspaceSections,
} from "@gnd/sales/dispatch-manifest/workspace";
import { salesDispatchStatus } from "@gnd/utils/constants";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

import { fulfillmentCalendarViews } from "@/components/dispatch-admin/fulfillment-calendar-range";

const dueBuckets = [
	"overdue",
	"today",
	"tomorrow",
	"upcoming",
	"unscheduled",
] as const;
const sheetModes = [
	"details",
	"create",
	"assign",
	"schedule",
	"exception",
	"resolve",
] as const;
const detailTabs = ["overview", "items", "route", "proof", "activity"] as const;

export const dispatchFilterParamsSchema = {
	section: parseAsStringLiteral(dispatchWorkspaceSections).withDefault(
		"dispatches",
	),
	stages: parseAsArrayOf(parseAsStringLiteral(dispatchWorkspaceStages)),
	tab: parseAsStringLiteral(["all", "pending", "completed", "calendar"]),
	status: parseAsStringLiteral(salesDispatchStatus),
	q: parseAsString,
	driversId: parseAsArrayOf(parseAsInteger, ","),
	dueBuckets: parseAsArrayOf(parseAsStringLiteral(dueBuckets), ","),
	scheduleRange: parseAsArrayOf(parseAsString, ","),
	scheduleDate: parseAsArrayOf(parseAsString, ","),
	deliveryModes: parseAsArrayOf(
		parseAsStringLiteral(["delivery", "pickup"]),
		",",
	),
	risks: parseAsArrayOf(parseAsStringLiteral(dispatchRiskCodes), ","),
	view: parseAsStringLiteral(["table", "calendar"]).withDefault("table"),
	calendarView: parseAsStringLiteral(fulfillmentCalendarViews).withDefault(
		"week",
	),
	calendarDate: parseAsString,
	dispatchId: parseAsInteger,
	dispatchSalesId: parseAsInteger,
	exceptionId: parseAsInteger,
	sheetMode: parseAsStringLiteral(sheetModes),
	detailTab: parseAsStringLiteral(detailTabs).withDefault("overview"),
	exceptionStatus: parseAsStringLiteral(["open", "resolved"]).withDefault(
		"open",
	),
};

export const dispatchSearchFilterParams = {
	q: dispatchFilterParamsSchema.q,
	stages: dispatchFilterParamsSchema.stages,
	driversId: dispatchFilterParamsSchema.driversId,
	dueBuckets: dispatchFilterParamsSchema.dueBuckets,
	scheduleRange: dispatchFilterParamsSchema.scheduleRange,
	deliveryModes: dispatchFilterParamsSchema.deliveryModes,
	risks: dispatchFilterParamsSchema.risks,
};

export const dispatchTableSearchFilterParams = {
	q: dispatchFilterParamsSchema.q,
	status: dispatchFilterParamsSchema.status,
	scheduleDate: dispatchFilterParamsSchema.scheduleDate,
};

export function useDispatchFilterParams() {
	const [filters, setFilters] = useQueryStates(dispatchFilterParamsSchema, {
		shallow: false,
	});
	const hasFilters = Boolean(
		filters.q ||
			filters.stages?.length ||
			filters.driversId?.length ||
			filters.dueBuckets?.length ||
			filters.scheduleRange?.length ||
			filters.deliveryModes?.length ||
			filters.risks?.length ||
			filters.status ||
			filters.tab,
	);
	return { filters, setFilters, hasFilters };
}

export const loadDispatchFilterParams = createLoader(
	dispatchFilterParamsSchema,
);
