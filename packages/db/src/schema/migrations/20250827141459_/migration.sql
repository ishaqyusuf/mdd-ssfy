/*
  Warnings:

  - Added the required column `inventoryId` to the `LineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItem` ADD COLUMN `inventoryId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `LineItem_inventoryId_idx` ON `LineItem`(`inventoryId`);
