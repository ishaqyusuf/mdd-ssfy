/*
  Warnings:

  - You are about to drop the `ExInventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventoryCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventoryCategoryVariantAttribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventoryItemSubCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventoryItemSubCategoryValues` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventorySubCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventoryVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventoryVariantAttribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExInventoryVariantPricing` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- DropTable
DROP TABLE `ExInventory`;

-- DropTable
DROP TABLE `ExInventoryCategory`;

-- DropTable
DROP TABLE `ExInventoryCategoryVariantAttribute`;

-- DropTable
DROP TABLE `ExInventoryItemSubCategory`;

-- DropTable
DROP TABLE `ExInventoryItemSubCategoryValues`;

-- DropTable
DROP TABLE `ExInventorySubCategory`;

-- DropTable
DROP TABLE `ExInventoryVariant`;

-- DropTable
DROP TABLE `ExInventoryVariantAttribute`;

-- DropTable
DROP TABLE `ExInventoryVariantPricing`;

-- CreateTable
CREATE TABLE `InventoryCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `img` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `img` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryCategoryId` INTEGER NOT NULL,

    INDEX `Inventory_inventoryCategoryId_idx`(`inventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `img` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryId` INTEGER NOT NULL,

    INDEX `InventoryVariant_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariantAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryVariantId` INTEGER NULL,
    `inventoryCategoryVariantAttributeId` INTEGER NULL,
    `valueId` INTEGER NULL,

    INDEX `InventoryVariantAttribute_valueId_idx`(`valueId`),
    INDEX `InventoryVariantAttribute_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryVariantAttribute_inventoryCategoryVariantAttributeI_idx`(`inventoryCategoryVariantAttributeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryCategoryVariantAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryCategoryId` INTEGER NOT NULL,
    `valuesInventoryCategoryId` INTEGER NOT NULL,

    INDEX `InventoryCategoryVariantAttribute_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `InventoryCategoryVariantAttribute_valuesInventoryCategoryId_idx`(`valuesInventoryCategoryId`),
    UNIQUE INDEX `InventoryCategoryVariantAttribute_inventoryCategoryId_values_key`(`inventoryCategoryId`, `valuesInventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariantPricing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `price` DOUBLE NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryVariantId` INTEGER NULL,
    `inventoryId` INTEGER NULL,

    INDEX `InventoryVariantPricing_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryVariantPricing_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItemSubCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryId` INTEGER NOT NULL,
    `valuesInventoryCategoryId` INTEGER NULL,
    `inventorySubCategoryId` INTEGER NULL,

    INDEX `InventoryItemSubCategory_inventoryId_idx`(`inventoryId`),
    INDEX `InventoryItemSubCategory_inventorySubCategoryId_idx`(`inventorySubCategoryId`),
    INDEX `InventoryItemSubCategory_valuesInventoryCategoryId_idx`(`valuesInventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItemSubCategoryValues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryItemSubCategoryId` INTEGER NULL,

    INDEX `InventoryItemSubCategoryValues_inventoryItemSubCategoryId_idx`(`inventoryItemSubCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventorySubCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `parentSubCategoryUid` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `parentInventoryCategoryId` INTEGER NOT NULL,

    INDEX `InventorySubCategory_parentInventoryCategoryId_idx`(`parentInventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryVariantId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `location` VARCHAR(191) NULL,
    `supplierId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InventoryStock_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryStock_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `notes` VARCHAR(191) NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryId` INTEGER NULL,

    INDEX `InventoryLog_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryLog_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
