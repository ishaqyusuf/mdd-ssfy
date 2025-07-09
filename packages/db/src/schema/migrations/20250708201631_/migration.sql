-- DropIndex
DROP INDEX `InventoryVariantAttribute_variantId_attributeId_key` ON `InventoryVariantAttribute`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;
