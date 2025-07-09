/*
  Warnings:

  - A unique constraint covering the columns `[name,uid]` on the table `InventoryType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `InventoryType_name_key` ON `InventoryType`;

-- DropIndex
DROP INDEX `InventoryType_uid_key` ON `InventoryType`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `InventoryType_name_uid_key` ON `InventoryType`(`name`, `uid`);
