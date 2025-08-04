/*
  Warnings:

  - Added the required column `type` to the `InventoryType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryCategory` ADD COLUMN `inventoryTypeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `InventoryType` ADD COLUMN `type` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `InventoryCategory_inventoryTypeId_idx` ON `InventoryCategory`(`inventoryTypeId`);
