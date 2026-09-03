export function listSalesTaxReportEntries(db, input) {
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
