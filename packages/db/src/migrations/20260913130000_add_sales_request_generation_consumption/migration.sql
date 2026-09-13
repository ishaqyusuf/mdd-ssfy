-- Bind a retained generation to the single native Sales row created from it.
-- No source text, generated seed, or provider payload is retained here.
ALTER TABLE `SalesRequestGenerationRun`
    ADD COLUMN `consumedSalesId` INTEGER NULL;

CREATE INDEX `sales_req_gen_consumed_sales_idx`
    ON `SalesRequestGenerationRun`(`consumedSalesId`);
