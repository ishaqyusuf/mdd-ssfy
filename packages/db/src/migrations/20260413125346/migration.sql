/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Inventory` ADD COLUMN `productKind` VARCHAR(191) NOT NULL DEFAULT 'inventory';

-- AlterTable
ALTER TABLE `Supplier` ADD COLUMN `uid` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `SupplierVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `supplierSku` VARCHAR(191) NULL,
    `costPrice` DOUBLE NULL,
    `salesPrice` DOUBLE NULL,
    `minOrderQty` INTEGER NULL,
    `leadTimeDays` INTEGER NULL,
    `preferred` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `SupplierVariant_supplierId_idx`(`supplierId`),
    INDEX `SupplierVariant_inventoryVariantId_idx`(`inventoryVariantId`),
    UNIQUE INDEX `SupplierVariant_supplierId_inventoryVariantId_key`(`supplierId`, `inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Supplier_uid_key` ON `Supplier`(`uid`);
