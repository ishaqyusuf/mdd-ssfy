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

export function getDefaultSalesTaxReportRange(now = new Date()) {
	const current = parseDateOnly(getSalesTaxBusinessDate(now));
	return {
		from: new Date(current.year, current.month - 1, 1),
		to: new Date(current.year, current.month - 1, current.day),
	};
}

export function isSelectableSalesTaxReportDate(date: Date, now = new Date()) {
	return formatSalesTaxCalendarDate(date) <= getSalesTaxBusinessDate(now);
}
