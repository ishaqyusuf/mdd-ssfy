import type { Db, TransactionClient } from "@gnd/db";

export const SALES_WORKFLOW_CATALOG_SCOPE = "shared-sales-workflow";

/** Read the committed catalog revision; no row represents the original catalog. */
export async function getSalesWorkflowCatalogRevision(
	db: Db | TransactionClient,
	scope = SALES_WORKFLOW_CATALOG_SCOPE,
) {
	const row = await db.salesWorkflowCatalogRevision.findUnique({
		where: { scope },
		select: { revision: true },
	});
	return row?.revision ?? 0;
}

/** Call inside the same DB transaction as every catalog-affecting write. */
export async function advanceSalesWorkflowCatalogRevision(
	db: Db | TransactionClient,
	scope = SALES_WORKFLOW_CATALOG_SCOPE,
) {
	await db.salesWorkflowCatalogRevision.createMany({
		data: [{ scope }],
		skipDuplicates: true,
	});
	const row = await db.salesWorkflowCatalogRevision.update({
		where: { scope },
		data: { revision: { increment: 1 } },
		select: { revision: true },
	});
	return row.revision;
}

/** A locking read at the end of a sales save prevents a catalog write from
 * committing between the final revision check and the sales transaction. */
export async function lockSalesWorkflowCatalogRevision(
	tx: TransactionClient,
	scope = SALES_WORKFLOW_CATALOG_SCOPE,
) {
	await tx.salesWorkflowCatalogRevision.createMany({
		data: [{ scope }],
		skipDuplicates: true,
	});
	const rows = await tx.$queryRaw<Array<{ revision: number }>>`
		SELECT revision FROM SalesWorkflowCatalogRevision
		WHERE scope = ${scope} FOR UPDATE
	`;
	return rows[0]?.revision ?? 0;
}
