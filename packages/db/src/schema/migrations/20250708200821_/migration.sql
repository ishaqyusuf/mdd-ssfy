/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `InventoryType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,associatedDykeStepId,associatedInventoryTypeId]` on the table `VariantAttribute` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uid` to the `InventoryType` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `VariantAttribute_name_key` ON `VariantAttribute`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryType` ADD COLUMN `uid` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `VariantAttribute` ADD COLUMN `associatedDykeStepId` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `associatedInventoryTypeId` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `InventoryType_uid_key` ON `InventoryType`(`uid`);

-- CreateIndex
CREATE UNIQUE INDEX `VariantAttribute_name_associatedDykeStepId_associatedInvento_key` ON `VariantAttribute`(`name`, `associatedDykeStepId`, `associatedInventoryTypeId`);
