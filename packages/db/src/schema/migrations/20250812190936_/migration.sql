/*
  Warnings:

  - Made the column `imageGalleryId` on table `InventoryImage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryImage` MODIFY `imageGalleryId` INTEGER NOT NULL;
