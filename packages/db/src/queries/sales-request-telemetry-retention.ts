export const SALES_REQUEST_GENERATION_RETENTION_DAYS = 90;

type SalesRequestGenerationRunPurgeModel = {
	deleteMany: (args: { where: Record<string, unknown> }) => Promise<{
		count: number;
	}>;
};

type SalesRequestGenerationRunAnonymizationModel = {
	updateMany: (args: {
		where: Record<string, unknown>;
		data: Record<string, unknown>;
	}) => Promise<{ count: number }>;
};

export type SalesRequestTelemetryPurgeDatabase = {
	salesRequestGenerationRun: SalesRequestGenerationRunPurgeModel;
};

export type SalesRequestTelemetryAnonymizationDatabase = {
	salesRequestGenerationRun: SalesRequestGenerationRunAnonymizationModel;
};

export async function purgeExpiredSalesRequestGenerationRuns(
	db: SalesRequestTelemetryPurgeDatabase,
	now = new Date(),
) {
	return db.salesRequestGenerationRun.deleteMany({
		where: { retentionUntil: { lte: now } },
	});
}

export async function anonymizeSalesRequestGenerationRunsForUser(
	db: SalesRequestTelemetryAnonymizationDatabase,
	actorUserId: number,
) {
	return db.salesRequestGenerationRun.updateMany({
		where: { actorUserId, deletedAt: null },
		data: { actorUserId: null },
	});
}
