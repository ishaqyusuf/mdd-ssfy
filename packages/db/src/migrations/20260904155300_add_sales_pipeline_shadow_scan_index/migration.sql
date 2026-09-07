CREATE INDEX `idx_sales_order_pipeline_shadow_scan`
    ON `SalesOrderListProjection`(`state`, `version`, `pipelineContractVersion`, `salesOrderId`);
