import type { Database } from "../index";

type SalesTaxReportQueryDb = Pick<Database, "salesTaxLedgerEntry">;

export type ListSalesTaxReportEntriesInput = {
	from: Date;
	toExclusive: Date;
	limit: number;
};

export function listSalesTaxReportEntries(
	db: SalesTaxReportQueryDb,
	input: ListSalesTaxReportEntriesInput,
) {
	return db.salesTaxLedgerEntry.findMany({
		where: {
			recognizedAt: { gte: input.from, lt: input.toExclusive },
			entryType: { in: ["SALE", "ADJUSTMENT", "REVERSAL"] },
		},
		orderBy: [{ recognizedAt: "asc" }, { id: "asc" }],
		take: input.limit + 1,
		select: {
			id: true,
			salesOrderId: true,
			entryType: true,
			recognitionSource: true,
			recognizedAt: true,
			orderNo: true,
			customerName: true,
			invoiceTotalCents: true,
			grossSalesCents: true,
			exemptSalesCents: true,
			taxableAmountCents: true,
			stateTaxCents: true,
			surtaxCents: true,
			taxDueCents: true,
			taxCode: true,
		},
	});
}
