/*
  Warnings:

  - You are about to drop the column `url` on the `InventoryImage` table. All the data in the column will be lost.
  - Added the required column `bucket` to the `ImageGallery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `ImageGallery` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ImageGallery` ADD COLUMN `bucket` VARCHAR(191) NOT NULL,
    ADD COLUMN `path` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Inventory` ADD COLUMN `stockMode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `InventoryImage` DROP COLUMN `url`;

-- AlterTable
ALTER TABLE `InventoryVariant` ADD COLUMN `publishedAt` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL;
