/*
  Warnings:

  - Added the required column `uid` to the `ExInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uid` to the `ExInventoryVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ExInventory` ADD COLUMN `uid` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `ExInventoryVariant` ADD COLUMN `uid` VARCHAR(191) NOT NULL;
