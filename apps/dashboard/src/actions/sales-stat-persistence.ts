import type { Prisma, TransactionClient } from "@gnd/db";

// A background projection can have already inserted these unique rows. Rebuild
// their values rather than treating that valid overlap as a failed order save.
export async function persistSalesQuantityStats(
	tx: Pick<TransactionClient, "qtyControl">,
	rows: Prisma.QtyControlCreateManyInput[],
) {
	for (const row of rows) {
		await tx.qtyControl.upsert({
			where: {
				itemControlUid_type: {
					itemControlUid: row.itemControlUid,
					type: row.type,
				},
			},
			create: row,
			update: row,
		});
	}
}
