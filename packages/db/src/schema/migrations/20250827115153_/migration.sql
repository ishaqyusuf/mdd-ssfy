/*
  Warnings:

  - You are about to drop the `InventoryActivity` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- DropTable
DROP TABLE `InventoryActivity`;

-- CreateTable
CREATE TABLE `LineItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NULL,
    `sn` INTEGER NULL DEFAULT 0,
    `title` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `qty` DOUBLE NULL DEFAULT 1,
    `unitCost` DOUBLE NULL,
    `totalCost` DOUBLE NULL,
    `meta` JSON NULL,
    `guestId` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `lineItemType` ENUM('CART', 'WISHLIST', 'QUOTE', 'SALE') NOT NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `wisthListItemId` INTEGER NULL,
    `cartItemId` INTEGER NULL,
    `saleId` INTEGER NULL,

    INDEX `LineItem_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `LineItem_wisthListItemId_idx`(`wisthListItemId`),
    INDEX `LineItem_cartItemId_idx`(`cartItemId`),
    INDEX `LineItem_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LineItemComponents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `qty` INTEGER NULL,
    `unitCost` INTEGER NULL,
    `totalCost` INTEGER NULL,
    `lineItemId` INTEGER NOT NULL,
    `inventoryCategoryId` INTEGER NULL,
    `subComponentId` INTEGER NULL,
    `inventoryId` INTEGER NULL,
    `inventoryVariantId` INTEGER NULL,

    INDEX `LineItemComponents_lineItemId_idx`(`lineItemId`),
    INDEX `LineItemComponents_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `LineItemComponents_inventoryId_idx`(`inventoryId`),
    INDEX `LineItemComponents_subComponentId_idx`(`subComponentId`),
    INDEX `LineItemComponents_inventoryCategoryId_idx`(`inventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
