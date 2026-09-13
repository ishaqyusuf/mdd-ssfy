-- Persist only bounded, allowlisted request-shape classification metadata.
-- Existing and unclassified generation runs remain valid with NULL values.
ALTER TABLE `SalesRequestGenerationRun`
    ADD COLUMN `requestComplexityVersion` VARCHAR(64) NULL,
    ADD COLUMN `requestComplexityStratum` VARCHAR(16) NULL;
