/*
  Warnings:

  - A unique constraint covering the columns `[inventoryVariantId]` on the table `InventoryVariantPricing` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryVariantPricing` ADD COLUMN `costPrice` DOUBLE NULL;

-- CreateTable
CREATE TABLE `PriceHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryVariantId` INTEGER NOT NULL,
    `oldPrice` DOUBLE NULL,
    `newPrice` DOUBLE NULL,
    `oldCostPrice` DOUBLE NULL,
    `newCostPrice` DOUBLE NULL,
    `currency` VARCHAR(191) NULL,
    `changeReason` VARCHAR(191) NULL,
    `changedBy` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `PriceHistory_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageGallery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ImageTags_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageGalleryTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `imageGalleryId` INTEGER NULL,
    `imageTagId` INTEGER NULL,

    INDEX `ImageGalleryTag_imageTagId_idx`(`imageTagId`),
    INDEX `ImageGalleryTag_imageGalleryId_idx`(`imageGalleryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `altText` VARCHAR(191) NULL,
    `position` INTEGER NULL,
    `inventoryId` INTEGER NULL,
    `inventoryVariantId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `imageGalleryId` INTEGER NULL,

    INDEX `InventoryImage_inventoryId_idx`(`inventoryId`),
    INDEX `InventoryImage_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryImage_imageGalleryId_idx`(`imageGalleryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryVariantId` INTEGER NOT NULL,
    `prevQty` DOUBLE NOT NULL,
    `currentQty` DOUBLE NOT NULL,
    `changeQty` DOUBLE NOT NULL,
    `type` ENUM('adjustment', 'stock_in', 'stock_out', 'sale', 'return', 'initial_stock') NOT NULL,
    `status` ENUM('pending', 'low_stock', 'completed') NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NULL,
    `inboundStockItemId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `StockMovement_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `StockMovement_inboundStockItemId_idx`(`inboundStockItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundShipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL,
    `expectedAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `reference` VARCHAR(191) NULL,
    `totalValue` DOUBLE NULL,
    `progress` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundShipment_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundShipmentItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inboundId` INTEGER NOT NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unitPrice` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundShipmentItem_inboundId_idx`(`inboundId`),
    INDEX `InboundShipmentItem_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `InventoryVariantPricing_inventoryVariantId_key` ON `InventoryVariantPricing`(`inventoryVariantId`);
