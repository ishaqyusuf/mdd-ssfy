ALTER TABLE `OrderDelivery`
ADD COLUMN `deliveredAt` DATETIME(0) NULL;

CREATE INDEX `OrderDelivery_deliveredAt_idx` ON `OrderDelivery`(`deliveredAt`);
