import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dbRoot = join(import.meta.dir, "../packages/db");

const requiredMigrations = [
	{
		name: "20260912200000_sales_request_generation_telemetry",
		markers: ["CREATE TABLE `SalesRequestGenerationRun`"],
	},
	{
		name: "20260913123000_add_sales_request_seed_digest",
		markers: ["ADD COLUMN `seedDigest` VARCHAR(67) NULL"],
	},
	{
		name: "20260913130000_add_sales_request_generation_consumption",
		markers: [
			"ADD COLUMN `consumedSalesId` INTEGER NULL",
			"sales_req_gen_consumed_sales_idx",
		],
	},
	{
		name: "20260913140000_add_sales_request_pilot_authority_revisions",
		markers: [
			"ADD COLUMN `pilotSettingsRevision` INTEGER NOT NULL DEFAULT 0",
			"ADD COLUMN `providerBenchmarkApprovalRevision` INTEGER NOT NULL DEFAULT 0",
			"sales_req_gen_started_deleted_idx",
		],
	},
	{
		name: "20260913150000_add_sales_request_pilot_review_authority",
		markers: [
			"CREATE TABLE `SalesRequestPilotReviewDecision`",
			"sales_req_pilot_review_period_key",
		],
	},
] as const;

describe("Sales Request rollout migration contract", () => {
	test("keeps every required migration in Prisma's configured active chain", async () => {
		const prismaConfig = await readFile(
			join(dbRoot, "prisma.config.ts"),
			"utf8",
		);
		expect(prismaConfig).toContain('path: "src/migrations"');

		for (const migration of requiredMigrations) {
			const sql = await readFile(
				join(dbRoot, "src/migrations", migration.name, "migration.sql"),
				"utf8",
			);
			for (const marker of migration.markers) {
				expect(sql).toContain(marker);
			}
		}
	});
});
