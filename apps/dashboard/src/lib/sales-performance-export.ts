import type {
	SalesPerformanceReportCell,
	SalesPerformanceReportSheet,
	SalesPerformanceWorkbookReport,
} from "@gnd/sales/performance-reports";
import type { WorkSheet } from "xlsx-js-style";

const MONEY_FORMAT = "$#,##0.00;[Red]-$#,##0.00";
const DATE_TIME_FORMAT = "m/d/yyyy h:mm";

export function getSalesPerformanceReportFileName(
	report: Pick<SalesPerformanceWorkbookReport, "fileSlug" | "generatedAt">,
) {
	const generatedAt = new Date(report.generatedAt);
	const stamp = Number.isNaN(generatedAt.getTime())
		? "report"
		: generatedAt.toISOString().replace(/[:]/g, "-").slice(0, 19);

	return `sales-${report.fileSlug}-${stamp}.xlsx`;
}

function excelCellValue(
	value: SalesPerformanceReportCell,
	type: SalesPerformanceReportSheet["columns"][number]["type"],
) {
	if (type !== "date-time" || typeof value !== "string" || !value) {
		return value ?? "";
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date;
}

export function toSalesPerformanceSheetMatrix(
	sheet: SalesPerformanceReportSheet,
) {
	return [
		sheet.columns.map((column) => column.label),
		...sheet.rows.map((row) =>
			sheet.columns.map((column) =>
				excelCellValue(row[column.key] ?? null, column.type),
			),
		),
	];
}

function styleWorksheet(
	utils: typeof import("xlsx-js-style").utils,
	worksheet: WorkSheet,
	sheet: SalesPerformanceReportSheet,
) {
	worksheet["!cols"] = sheet.columns.map((column) => ({ wch: column.width }));
	worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
	if (!worksheet["!ref"]) return;

	worksheet["!autofilter"] = { ref: worksheet["!ref"] };
	const range = utils.decode_range(worksheet["!ref"]);

	for (
		let columnIndex = range.s.c;
		columnIndex <= range.e.c;
		columnIndex += 1
	) {
		const column = sheet.columns[columnIndex];
		const header = worksheet[utils.encode_cell({ r: 0, c: columnIndex })];
		if (header) {
			header.s = {
				font: { bold: true, color: { rgb: "FFFFFF" } },
				fill: { fgColor: { rgb: "1F2937" } },
				alignment: { horizontal: "center", vertical: "center" },
				border: {
					top: { style: "thin", color: { rgb: "CBD5E1" } },
					bottom: { style: "thin", color: { rgb: "CBD5E1" } },
					left: { style: "thin", color: { rgb: "CBD5E1" } },
					right: { style: "thin", color: { rgb: "CBD5E1" } },
				},
			};
		}
		if (!column) continue;

		for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
			const cell =
				worksheet[utils.encode_cell({ r: rowIndex, c: columnIndex })];
			if (!cell) continue;
			cell.s = {
				alignment: {
					vertical: "top",
					wrapText: column.type === "text" && column.width >= 24,
				},
			};
			if (column.type === "money") cell.z = MONEY_FORMAT;
			if (column.type === "integer") cell.z = "0";
			if (column.type === "number") cell.z = "0.00";
			if (column.type === "date-time" && cell.v instanceof Date) {
				cell.t = "d";
				cell.z = DATE_TIME_FORMAT;
			}
		}
	}
}

export async function downloadSalesPerformanceExcel(
	report: SalesPerformanceWorkbookReport,
) {
	const { utils, writeFile } = await import("xlsx-js-style");
	const workbook = utils.book_new();
	workbook.Props = {
		Title: report.title,
		Subject: report.description,
		Author: "GND Sales",
		CreatedDate: new Date(report.generatedAt),
	};

	for (const sheet of report.sheets) {
		const worksheet = utils.aoa_to_sheet(toSalesPerformanceSheetMatrix(sheet), {
			cellDates: true,
		});
		styleWorksheet(utils, worksheet, sheet);
		utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
	}
	writeFile(workbook, getSalesPerformanceReportFileName(report), {
		compression: true,
	});
}
