-- DropIndex
DROP INDEX `SalesExtraCosts_type_orderId_key` ON `SalesExtraCosts`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;
