/*
  Warnings:

  - Added the required column `inventoryCategoryId` to the `LineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItem` ADD COLUMN `inventoryCategoryId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `LineItem_inventoryCategoryId_idx` ON `LineItem`(`inventoryCategoryId`);
