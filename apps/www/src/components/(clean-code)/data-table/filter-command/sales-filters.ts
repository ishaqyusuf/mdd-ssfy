import {
	DISPATCH_FILTER_OPTIONS,
	INVOICE_FILTER_OPTIONS,
	PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	PRODUCTION_FILTER_OPTIONS,
} from "@sales/filter-constants";
import {
	filterCol,
	filterFields,
	type Filters,
} from "./filters";

const SalesPriority = [] as any;

export const __filters = (): Filters => ({
	"production-tasks": {
		fields: [
			filterFields["orderNo"],
			filterFields["production"],
			filterFields.search,
			filterFields["production.dueDate"],
		],
	},
	"sales-delivery": {
		fields: [],
		filterColumns: [],
	},
	"sales-productions": {
		fields: [
			filterFields["orderNo"],
			filterFields["production"],
			filterFields.search,
			filterFields["production.dueDate"],
		],
		options: {
			invoice: INVOICE_FILTER_OPTIONS,
			"dispatch.status": DISPATCH_FILTER_OPTIONS,
			production: PRODUCTION_FILTER_OPTIONS,
			"production.assignment": PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
			"sales.priority": Object.keys(SalesPriority),
		},
	},
	customers: {
		fields: [filterFields.search],
		filterColumns: [filterCol("search")],
	},
	orders: {
		fields: [
			filterFields["orderNo"],
			filterFields.po,
			filterFields.phone,
			filterFields["customer.name"],
			filterFields["dispatch.status"],
			filterFields["production.assignment"],
			filterFields.production,
			filterFields.invoice,
			filterFields["sales.rep"],
			filterFields.search,
			filterFields["sales.priority"],
		],
		filterColumns: [
			filterCol("orderNo"),
			filterCol("customer.name"),
			filterCol("dispatch.status"),
			filterCol("production.assignment"),
			filterCol("production"),
			filterCol("invoice"),
			filterCol("sales.rep"),
			filterCol("search"),
			filterCol("sales.priority"),
		],
		options: {
			invoice: INVOICE_FILTER_OPTIONS,
			"dispatch.status": DISPATCH_FILTER_OPTIONS,
			production: PRODUCTION_FILTER_OPTIONS,
			"production.assignment": PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
			"sales.priority": Object.keys(SalesPriority),
		},
	},
	quotes: {
		fields: [
			filterFields.search,
			filterFields["orderNo"],
			filterFields.po,
			filterFields.phone,
			filterFields["customer.name"],
			filterFields["sales.rep"],
		],
		filterColumns: [filterCol("search")],
	},
	"sales-accounting": {
		fields: [filterFields.search, filterFields["orderNo"]],
		options: {},
	},
});
