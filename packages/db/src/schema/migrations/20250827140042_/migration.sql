/*
  Warnings:

  - You are about to drop the column `costPrice` on the `LineItemComponents` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `LineItemComponents` table. All the data in the column will be lost.
  - You are about to drop the column `salesPrice` on the `LineItemComponents` table. All the data in the column will be lost.
  - You are about to drop the column `unitCostPrice` on the `LineItemComponents` table. All the data in the column will be lost.
  - You are about to drop the column `unitSalesPrice` on the `LineItemComponents` table. All the data in the column will be lost.
  - Added the required column `linePricingId` to the `LineItemComponents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItem` ADD COLUMN `linePricingId` INTEGER NULL;

-- AlterTable
ALTER TABLE `LineItemComponents` DROP COLUMN `costPrice`,
    DROP COLUMN `qty`,
    DROP COLUMN `salesPrice`,
    DROP COLUMN `unitCostPrice`,
    DROP COLUMN `unitSalesPrice`,
    ADD COLUMN `linePricingId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `LinePricing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `qty` INTEGER NULL,
    `costPrice` INTEGER NULL,
    `salesPrice` INTEGER NULL,
    `unitCostPrice` INTEGER NULL,
    `unitSalesPrice` INTEGER NULL,
    `inventoryVariantId` INTEGER NULL,
    `inventoryId` INTEGER NULL,

    INDEX `LinePricing_inventoryId_idx`(`inventoryId`),
    INDEX `LinePricing_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `LineItem_linePricingId_idx` ON `LineItem`(`linePricingId`);

-- CreateIndex
CREATE INDEX `LineItemComponents_linePricingId_idx` ON `LineItemComponents`(`linePricingId`);
