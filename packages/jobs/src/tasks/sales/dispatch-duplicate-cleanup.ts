import { type Db, Prisma } from "@gnd/db";
import {
	PackingReportError,
	lockAndAssertNoPendingPackingReports,
} from "@gnd/sales/packing-report-review";

export type DuplicateDispatchCleanupGroup = {
	salesId: number;
	keepDispatchId: number;
	deleteDispatchIds: number[];
};

export type DuplicateDispatchCleanupResult = DuplicateDispatchCleanupGroup & {
	deletedCount: number;
	blocked: boolean;
	blockedReason?: string;
};

async function cleanDuplicateDispatchGroup(
	db: Db,
	group: DuplicateDispatchCleanupGroup,
) {
	const deleteDispatchIds = [...new Set(group.deleteDispatchIds)].sort(
		(a, b) => a - b,
	);

	return db.$transaction(
		async (tx) => {
			for (const dispatchId of deleteDispatchIds) {
				await lockAndAssertNoPendingPackingReports(tx, {
					dispatchId,
					salesOrderId: group.salesId,
				});
			}

			const result = await tx.orderDelivery.updateMany({
				where: {
					salesOrderId: group.salesId,
					id: { in: deleteDispatchIds },
					deletedAt: null,
				},
				data: { deletedAt: new Date() },
			});

			return result.count;
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}

export async function cleanDuplicateDispatchGroups(
	db: Db,
	groups: DuplicateDispatchCleanupGroup[],
) {
	const results: DuplicateDispatchCleanupResult[] = [];

	for (const group of groups) {
		try {
			const deletedCount = await cleanDuplicateDispatchGroup(db, group);
			results.push({
				...group,
				deleteDispatchIds: [...new Set(group.deleteDispatchIds)].sort(
					(a, b) => a - b,
				),
				deletedCount,
				blocked: false,
			});
		} catch (error) {
			if (!(error instanceof PackingReportError)) throw error;
			results.push({
				...group,
				deleteDispatchIds: [...new Set(group.deleteDispatchIds)].sort(
					(a, b) => a - b,
				),
				deletedCount: 0,
				blocked: true,
				blockedReason: error.message,
			});
		}
	}

	return results;
}
