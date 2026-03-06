-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `SalesExtraCosts` MODIFY `type` ENUM('Discount', 'DiscountPercentage', 'Labor', 'FlatLabor', 'CustomTaxxable', 'CustomNonTaxxable', 'Delivery', 'EXT') NOT NULL;
