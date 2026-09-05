import { Prisma, type Db } from "@gnd/db";
import {
	SALES_PIPELINE_COHORT_MULTIPLIER,
	getSalesPipelineReadMode,
	salesPipelineCohortPercentage,
} from "./sales-pipeline-rollout";

/** MySQL equivalent of abs(imul(orderId, multiplier)) % 100. */
export function salesPipelineCohortBucketSql(orderId: Prisma.Sql) {
	// Decimal arithmetic avoids floating-point rounding before signed Int32 wrap.
	return Prisma.sql`MOD(ABS(MOD(
		CAST(${orderId} AS DECIMAL(20, 0)) * CAST(${SALES_PIPELINE_COHORT_MULTIPLIER} AS DECIMAL(20, 0))
		+ 2147483648, 4294967296) - 2147483648), 100)`;
}

export function canonicalSalesPipelineCohortPageQuery(cursor: number, percentage: number) {
	return Prisma.sql`SELECT id FROM SalesOrders
		WHERE id > ${cursor} AND deletedAt IS NULL AND type = 'order'
		AND ${salesPipelineCohortBucketSql(Prisma.sql`id`)} < ${percentage}
		ORDER BY id ASC LIMIT 250`;
}

/** null means every order; [] means no order. Only bounded rollout IDs are read. */
export async function getCanonicalSalesPipelineCohortIds(
	db: Db,
	env: Record<string, string | undefined> = process.env,
): Promise<number[] | null> {
	const percentage = salesPipelineCohortPercentage(env);
	if (getSalesPipelineReadMode(env) !== "canonical" || !(percentage > 0)) return [];
	if (percentage >= 100) return null;
	const ids: number[] = [];
	let cursor = 0;
	for (;;) {
		const page = await db.$queryRaw<Array<{ id: number }>>(
			canonicalSalesPipelineCohortPageQuery(cursor, percentage),
		);
		ids.push(...page.map((row) => row.id));
		if (page.length < 250) return ids;
		cursor = page[page.length - 1]!.id;
	}
}
