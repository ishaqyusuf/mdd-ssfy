-- Bind successful generation telemetry to its validated normalized seed without
-- retaining source text, provider output, or the seed payload itself.
ALTER TABLE `SalesRequestGenerationRun`
    ADD COLUMN `seedDigest` VARCHAR(67) NULL;
