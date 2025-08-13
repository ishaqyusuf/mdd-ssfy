/*
  Warnings:

  - You are about to drop the column `valuesInventoryCategoryId` on the `InventoryItemSubCategory` table. All the data in the column will be lost.
  - You are about to drop the `InventoryItemSubCategoryValues` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `InventoryItemSubCategory_valuesInventoryCategoryId_idx` ON `InventoryItemSubCategory`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryItemSubCategory` DROP COLUMN `valuesInventoryCategoryId`,
    ADD COLUMN `operator` ENUM('is', 'isNot') NULL;

-- DropTable
DROP TABLE `InventoryItemSubCategoryValues`;

-- CreateTable
CREATE TABLE `InventoryItemSubCategoryValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operator` ENUM('is', 'isNot') NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `subCategoryId` INTEGER NOT NULL,
    `inventoryId` INTEGER NOT NULL,

    UNIQUE INDEX `InventoryItemSubCategoryValue_subCategoryId_key`(`subCategoryId`),
    INDEX `InventoryItemSubCategoryValue_subCategoryId_idx`(`subCategoryId`),
    INDEX `InventoryItemSubCategoryValue_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
