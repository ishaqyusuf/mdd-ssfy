/*
  Warnings:

  - You are about to drop the column `attributeId` on the `InventoryVariantAttribute` table. All the data in the column will be lost.
  - You are about to drop the `VariantAttribute` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `inventoryTypeAttributeId` to the `InventoryVariantAttribute` table without a default value. This is not possible if the table is not empty.
  - Made the column `variantId` on table `InventoryVariantAttribute` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `InventoryVariantAttribute_attributeId_idx` ON `InventoryVariantAttribute`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryVariantAttribute` DROP COLUMN `attributeId`,
    ADD COLUMN `inventoryTypeAttributeId` INTEGER NOT NULL,
    MODIFY `variantId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `VariantAttribute`;

-- CreateIndex
CREATE INDEX `InventoryVariantAttribute_inventoryTypeAttributeId_idx` ON `InventoryVariantAttribute`(`inventoryTypeAttributeId`);
