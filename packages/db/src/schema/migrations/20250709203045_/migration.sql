/*
  Warnings:

  - You are about to drop the column `value` on the `InventoryVariantAttribute` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryVariantAttribute` DROP COLUMN `value`;
