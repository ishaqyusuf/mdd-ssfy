-- Add searchable lifecycle dimensions to the existing derived list projection.
-- Operational sales, production, and fulfillment records remain authoritative.
ALTER TABLE `SalesOrderListProjection`
    ADD COLUMN `pipelineContractVersion` VARCHAR(32) NULL,
    ADD COLUMN `pipelineRevision` VARCHAR(64) NULL,
    ADD COLUMN `pipelineHeadline` VARCHAR(64) NULL,
    ADD COLUMN `pipelineProductionApplicability` VARCHAR(32) NULL,
    ADD COLUMN `pipelineProductionState` VARCHAR(48) NULL,
    ADD COLUMN `pipelineFulfillmentApplicability` VARCHAR(32) NULL,
    ADD COLUMN `pipelineFulfillmentState` VARCHAR(48) NULL;

CREATE INDEX `idx_sales_order_pipeline_headline`
    ON `SalesOrderListProjection`(`state`, `version`, `pipelineHeadline`, `salesCreatedAt`, `salesOrderId`);

CREATE INDEX `idx_sales_order_pipeline_production`
    ON `SalesOrderListProjection`(`state`, `version`, `pipelineProductionApplicability`, `pipelineProductionState`, `salesCreatedAt`, `salesOrderId`);

CREATE INDEX `idx_sales_order_pipeline_fulfillment`
    ON `SalesOrderListProjection`(`state`, `version`, `pipelineFulfillmentApplicability`, `pipelineFulfillmentState`, `salesCreatedAt`, `salesOrderId`);
