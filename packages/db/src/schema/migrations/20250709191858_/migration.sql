/*
  Warnings:

  - You are about to drop the column `attributeId` on the `InventoryTypeAttribute` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uid]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attributedInventoryTypeId` to the `InventoryTypeAttribute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attributedVariantId` to the `InventoryVariantAttribute` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `InventoryTypeAttribute_attributeId_idx` ON `InventoryTypeAttribute`;

-- DropIndex
DROP INDEX `InventoryTypeAttribute_inventoryTypeId_attributeId_key` ON `InventoryTypeAttribute`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryCategory` ADD COLUMN `deletedAt` TIMESTAMP(0) NULL;

-- AlterTable
ALTER TABLE `InventoryLog` ADD COLUMN `deletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `InventoryType` ADD COLUMN `deletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `published` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `InventoryTypeAttribute` DROP COLUMN `attributeId`,
    ADD COLUMN `attributedInventoryTypeId` INTEGER NOT NULL,
    ADD COLUMN `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `deletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `InventoryVariantAttribute` ADD COLUMN `attributedVariantId` INTEGER NOT NULL,
    ADD COLUMN `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `deletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Supplier` ADD COLUMN `deletedAt` TIMESTAMP(0) NULL;

-- AlterTable
ALTER TABLE `VariantAttribute` ADD COLUMN `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `deletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Inventory_uid_key` ON `Inventory`(`uid`);

-- CreateIndex
CREATE INDEX `InventoryTypeAttribute_attributedInventoryTypeId_idx` ON `InventoryTypeAttribute`(`attributedInventoryTypeId`);

-- CreateIndex
CREATE INDEX `InventoryVariantAttribute_attributedVariantId_idx` ON `InventoryVariantAttribute`(`attributedVariantId`);
