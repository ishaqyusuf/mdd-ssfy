-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Inventory` ADD COLUMN `defaultSupplierId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Inventory_defaultSupplierId_idx` ON `Inventory`(`defaultSupplierId`);
