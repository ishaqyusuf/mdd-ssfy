-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ExInventoryVariantPricing` ADD COLUMN `inventoryId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `ExInventoryVariantPricing_inventoryId_idx` ON `ExInventoryVariantPricing`(`inventoryId`);
