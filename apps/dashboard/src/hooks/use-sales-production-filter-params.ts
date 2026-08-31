import { PRODUCTION_FILTER_OPTIONS } from "@gnd/utils/constants";
import { SALES_PRIORITY_VALUES } from "@sales/priority";
import {
	SALES_PRODUCTION_DUE_FILTERS,
	SALES_PRODUCTION_MATERIAL_FILTERS,
	SALES_PRODUCTION_QUEUE_STATES,
	SALES_PRODUCTION_SORTS,
	SALES_PRODUCTION_WORKSPACE_TAB_PARAMS,
	SALES_PRODUCTION_WORKSPACE_VIEWS,
} from "@sales/production-workspace-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { createLoader, createParser, parseAsStringLiteral } from "nuqs/server";

import { operationsCalendarViews } from "@/components/operations-calendar/range";

const parseAsProductionDate = createParser({
	parse(value) {
		const date = new Date(`${value}T00:00:00Z`);
		return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
			Number.isFinite(date.getTime()) &&
			date.toISOString().slice(0, 10) === value
			? value
			: null;
	},
	serialize(value) {
		return value;
	},
});

export const salesProductionFilterParamsSchema = {
	q: parseAsString,
	reviewId: parseAsInteger,
	assignedToId: parseAsInteger,
	"customer.name": parseAsString,
	phone: parseAsString,
	po: parseAsString,
	item: parseAsString,
	"sales.rep": parseAsString,
	invoice: parseAsStringLiteral(["paid", "pending"] as const),
	tab: parseAsStringLiteral(SALES_PRODUCTION_WORKSPACE_TAB_PARAMS),
	view: parseAsStringLiteral(SALES_PRODUCTION_WORKSPACE_VIEWS),
	calendarView: parseAsStringLiteral(operationsCalendarViews).withDefault(
		"week",
	),
	calendarDate: parseAsProductionDate,
	queue: parseAsStringLiteral(SALES_PRODUCTION_QUEUE_STATES),
	due: parseAsStringLiteral(SALES_PRODUCTION_DUE_FILTERS),
	date: parseAsProductionDate,
	material: parseAsStringLiteral(SALES_PRODUCTION_MATERIAL_FILTERS),
	sort: parseAsStringLiteral(SALES_PRODUCTION_SORTS),
	label: parseAsString,
	production: parseAsStringLiteral(PRODUCTION_FILTER_OPTIONS),
	productionDueDate: parseAsProductionDate,
	priority: parseAsStringLiteral(SALES_PRIORITY_VALUES),
	salesNo: parseAsString,
	show: parseAsStringLiteral([
		"due-today",
		"due-tomorrow",
		"past-due",
		"future",
		"unscheduled",
	] as const),
};

export function useSalesProductionFilterParams() {
	const [filters, setFilters] = useQueryStates(
		salesProductionFilterParamsSchema,
	);
	return {
		filters,
		setFilters,
		hasFilters: Object.entries(filters).some(
			([key, value]) =>
				!["tab", "view", "calendarView", "calendarDate"].includes(key) &&
				value !== null,
		),
	};
}
export const loadSalesProductionFilterParams = createLoader(
	salesProductionFilterParamsSchema,
);
