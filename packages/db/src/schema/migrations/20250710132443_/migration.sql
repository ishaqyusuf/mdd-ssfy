/*
  Warnings:

  - You are about to drop the column `attributedVariantId` on the `InventoryVariantAttribute` table. All the data in the column will be lost.
  - Added the required column `attributedInventoryId` to the `InventoryVariantAttribute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventoryId` to the `InventoryVariantPrice` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `InventoryVariantAttribute_attributedVariantId_idx` ON `InventoryVariantAttribute`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryVariantAttribute` DROP COLUMN `attributedVariantId`,
    ADD COLUMN `attributedInventoryId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `InventoryVariantPrice` ADD COLUMN `inventoryId` INTEGER NOT NULL,
    MODIFY `inventoryVariantId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `InventoryVariantAttribute_attributedInventoryId_idx` ON `InventoryVariantAttribute`(`attributedInventoryId`);

-- CreateIndex
CREATE INDEX `InventoryVariantPrice_inventoryId_idx` ON `InventoryVariantPrice`(`inventoryId`);
