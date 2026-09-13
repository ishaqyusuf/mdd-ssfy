-- Bind each generation to the exact pilot and provider-benchmark revisions
-- observed before provider work. Zero preserves legacy rows as non-advancing.
ALTER TABLE `SalesRequestGenerationRun`
    ADD COLUMN `pilotSettingsRevision` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `providerBenchmarkApprovalRevision` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `sales_req_gen_started_deleted_idx`
    ON `SalesRequestGenerationRun`(`startedAt`, `deletedAt`);
