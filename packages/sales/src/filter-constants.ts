import {
	SALES_DELIVERY_OPTIONS,
	SALES_PAYMENT_METHOD_OPTIONS,
} from "./constants";
import type { SalesDispatchStatus } from "./types";

export const SEPARATOR = " &";

export const dispatchStatusList: SalesDispatchStatus[] = [
	"queue",
	"in progress",
	"cancelled",
	"completed",
] as const;

export const INVOICE_FILTER_OPTIONS = [
	"paid",
	"pending",
	"late",
	"part-paid",
	"overdraft",
] as const;

export const PRODUCTION_FILTER_OPTIONS = [
	"pending",
	"in progress",
	"completed",
] as const;

export const PRODUCTION_STATUS = [
	"not assigned",
	"part assigned",
	"due today",
	"past due",
	"completed",
	"not completed",
] as const;

export const PRODUCTION_ASSIGNMENT_FILTER_OPTIONS = [
	"not assigned",
	"part assigned",
	"all assigned",
] as const;

export const DISPATCH_FILTER_OPTIONS = [
	"delivered",
	"pending delivery",
	"backorder",
	"late",
] as const;

export const widthList = [
	"1-0",
	"1-4",
	"1-6",
	"1-8",
	"1-10",
	"2-0",
	"2-4",
	"2-6",
	"2-8",
	"2-10",
	"3-0",
	"4-0",
	"4-8",
	"5-0",
	"5-4",
	"5-8",
	"6-0",
	"6-8",
] as const;

export const paymentMethods = SALES_PAYMENT_METHOD_OPTIONS;
export const dispatchModes = SALES_DELIVERY_OPTIONS;
