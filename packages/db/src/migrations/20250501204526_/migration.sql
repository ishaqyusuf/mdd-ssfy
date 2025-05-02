-- AlterTable
ALTER TABLE `SalesExtraCosts` ADD COLUMN `percentage` DOUBLE NULL,
    MODIFY `type` ENUM('Discount', 'DiscountPercentage', 'Labor', 'CustomTaxxable', 'CustomNonTaxxable') NOT NULL;
