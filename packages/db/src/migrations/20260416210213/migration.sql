-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `OrderDelivery` ADD COLUMN `deliveredAt` TIMESTAMP(0) NULL;

-- CreateIndex
CREATE INDEX `OrderDelivery_deliveredAt_idx` ON `OrderDelivery`(`deliveredAt`);
