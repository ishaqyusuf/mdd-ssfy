-- AlterTable
ALTER TABLE `SalesExtraCosts` MODIFY `type` ENUM('Discount', 'DiscountPercentage', 'Labor', 'CustomTaxxable', 'CustomNonTaxxable', 'Delivery') NOT NULL;
