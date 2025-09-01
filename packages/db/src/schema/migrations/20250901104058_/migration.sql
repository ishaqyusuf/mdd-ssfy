/*
  Warnings:

  - A unique constraint covering the columns `[salesItemId]` on the table `LineItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItem` ADD COLUMN `salesItemId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `LineItem_salesItemId_key` ON `LineItem`(`salesItemId`);

-- CreateIndex
CREATE INDEX `PriceBasedRate_priceBasedId_idx` ON `PriceBasedRate`(`priceBasedId`);

-- CreateIndex
CREATE INDEX `ShippingZone_zoneBasedId_idx` ON `ShippingZone`(`zoneBasedId`);

-- CreateIndex
CREATE INDEX `WeightBasedRate_weightBasedId_idx` ON `WeightBasedRate`(`weightBasedId`);
