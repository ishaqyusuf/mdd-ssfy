/*
  Warnings:

  - You are about to alter the column `unitPrice` on the `DykeSalesShelfItem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(12,2)`.
  - You are about to alter the column `totalPrice` on the `DykeSalesShelfItem` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE `DykeSalesShelfItem` MODIFY `unitPrice` DECIMAL(12, 2) NULL,
    MODIFY `totalPrice` DECIMAL(12, 2) NULL;
