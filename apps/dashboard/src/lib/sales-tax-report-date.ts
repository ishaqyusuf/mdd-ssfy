import { getSalesTaxBusinessDate } from "@gnd/sales/sales-tax-report";

function parseDateOnly(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	return { year: year || 0, month: month || 0, day: day || 0 };
}

export function formatSalesTaxCalendarDate(date: Date) {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

export function getSalesTaxReportStartDate(endDate: Date) {
	return new Date(endDate.getFullYear(), endDate.getMonth(), 1);
}

export function getInitialSalesTaxReportMonth(now = new Date()) {
	const current = parseDateOnly(getSalesTaxBusinessDate(now));
	return current.day >= 25
		? new Date(current.year, current.month - 1, 1)
		: new Date(current.year, current.month - 2, 1);
}

export function isSelectableSalesTaxReportEndDate(
	date: Date,
	now = new Date(),
) {
	return (
		date.getDate() >= 25 &&
		formatSalesTaxCalendarDate(date) <= getSalesTaxBusinessDate(now)
	);
}
