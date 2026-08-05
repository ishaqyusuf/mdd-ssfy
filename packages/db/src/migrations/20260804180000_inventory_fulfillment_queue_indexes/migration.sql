-- AddIndex
CREATE INDEX `idx_sales_fulfillment_queue`
    ON `SalesOrders`(`deletedAt`, `status`, `prodStatus`, `id`);

-- AddIndex
CREATE INDEX `idx_sales_delivery_queue`
    ON `SalesOrders`(`deletedAt`, `deliveryOption`, `id`);

-- AddIndex
CREATE INDEX `idx_line_item_fulfillment_queue`
    ON `LineItem`(`saleId`, `deletedAt`, `lineItemType`, `id`);

-- AddIndex
CREATE INDEX `idx_line_component_fulfillment`
    ON `LineItemComponents`(`status`, `lineItemId`, `inventoryVariantId`);

-- AddIndex
CREATE INDEX `idx_stock_allocation_fulfillment`
    ON `StockAllocation`(`lineItemComponentId`, `status`, `deletedAt`);

-- AddIndex
CREATE INDEX `idx_inbound_demand_fulfillment`
    ON `InboundDemand`(`lineItemComponentId`, `status`, `deletedAt`);
