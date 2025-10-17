/*
  Warnings:

  - A unique constraint covering the columns `[inventoryCategoryId,valuesInventoryCategoryId]` on the table `ExInventoryCategoryVariantAttribute` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `ExInventoryCategoryVariantAttribute_inventoryCategoryId_valu_key` ON `ExInventoryCategoryVariantAttribute`(`inventoryCategoryId`, `valuesInventoryCategoryId`);
