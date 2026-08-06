ALTER TABLE `StockAllocation`
    ADD COLUMN `orderDeliveryId` INTEGER NULL;

CREATE INDEX `StockAllocation_orderDeliveryId_idx`
    ON `StockAllocation`(`orderDeliveryId`);

CREATE INDEX `idx_stock_allocation_dispatch`
    ON `StockAllocation`(`orderDeliveryId`, `status`, `deletedAt`);

ALTER TABLE `StockAllocation`
    ADD CONSTRAINT `StockAllocation_orderDeliveryId_fkey`
    FOREIGN KEY (`orderDeliveryId`) REFERENCES `OrderDelivery`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
