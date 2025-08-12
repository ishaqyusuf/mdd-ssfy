-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Inventory` ADD COLUMN `description` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `InventoryVariant` ADD COLUMN `description` VARCHAR(191) NULL;
