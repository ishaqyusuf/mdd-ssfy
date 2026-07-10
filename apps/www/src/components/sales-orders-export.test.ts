import { describe, expect, it } from "bun:test";
import { formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import {
	type SalesOrdersExportOrder,
	buildSalesOrderOverviewUrl,
	buildSalesOrdersExportInput,
	getSalesOrdersExportFileName,
	hasSalesOrdersExportTrigger,
	toSalesOrdersExportRows,
} from "./sales-orders-export";

const baseOrder: SalesOrdersExportOrder = {
	id: 410,
	orderId: "08609PC",
	createdAt: "2026-07-10T12:00:00.000Z",
	salesDate: "10/07/2026",
	salesRepName: "Ada Lovelace",
	poNo: "PO-77",
	invoiceTotal: 1234.5,
	displayAmountPaid: 1000,
	displayAmountDue: 234.5,
	customerName: "Bluebird Ltd",
	customerPhone: "555-0199",
	address: "15 Market Road",
	deliveryOption: "Pickup",
	statusLabel: "Processing",
};

describe("sales orders export helpers", () => {
	it("maps current Sales Orders V2 rows into the Excel report shape", () => {
		const [row] = toSalesOrdersExportRows(
			[baseOrder],
			"https://app.example.com/",
		);

		expect(row.Sn).toBe("1.");
		expect(row.Date).toBe("10/07/2026");
		expect(row["Order #"]).toEqual({
			t: "s",
			v: "08609PC",
			l: {
				Target:
					"https://app.example.com/sales-book/orders?sales-overview-id=08609PC&sales-type=order&mode=sales&salesTab=general",
			},
		});
		expect(row["Sales Rep"]).toBe("Ada Lovelace");
		expect(row["P.O"]).toBe("PO-77");
		expect(row.Invoice).toBe(formatMoney(1234.5));
		expect(row.Paid).toBe(formatMoney(1000));
		expect(row.Pending).toBe(formatMoney(234.5));
		expect(row.Customer).toBe("Bluebird Ltd");
		expect(row.Phone).toBe("555-0199");
		expect(row.Address).toBe("15 Market Road");
		expect(row["Delivery Method"]).toBe("Pickup");
		expect(row.Status).toBe("Processing");
	});

	it("falls back to createdAt and displayName when normalized fields are missing", () => {
		const [row] = toSalesOrdersExportRows(
			[
				{
					...baseOrder,
					salesDate: null,
					customerName: null,
					displayName: "Fallback Customer",
				},
			],
			"https://app.example.com",
		);

		expect(row.Date).toBe(formatDate("2026-07-10T12:00:00.000Z"));
		expect(row.Customer).toBe("Fallback Customer");
	});

	it("builds the historical sales overview link", () => {
		expect(buildSalesOrderOverviewUrl("https://app.example.com/", "ORD-42")).toBe(
			"https://app.example.com/sales-book/orders?sales-overview-id=ORD-42&sales-type=order&mode=sales&salesTab=general",
		);
	});

	it("exports only filtered or selected sales order sets", () => {
		expect(hasSalesOrdersExportTrigger(false, [])).toBe(false);
		expect(hasSalesOrdersExportTrigger(true, [])).toBe(true);
		expect(hasSalesOrdersExportTrigger(false, [410])).toBe(true);
	});

	it("builds the export query from filters, selected ids, and sort order", () => {
		expect(
			buildSalesOrdersExportInput(
				{
					q: "08609",
					showing: "all sales",
				},
				[410, 411],
				["createdAt.desc"],
			),
		).toEqual({
			q: "08609",
			showing: "all sales",
			salesIds: [410, 411],
			size: 999,
			sort: ["createdAt.desc"],
		});
	});

	it("uses the legacy report filename pattern", () => {
		expect(getSalesOrdersExportFileName("2026-07-10T12:00:00.000Z")).toBe(
			"sales-report-export-10-07-2026.xlsx",
		);
	});
});
