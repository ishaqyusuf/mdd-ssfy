/*
  Warnings:

  - You are about to drop the column `depUid` on the `InventoryVariant` table. All the data in the column will be lost.
  - You are about to drop the column `prodUid` on the `InventoryVariant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uid]` on the table `InventoryVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uid` to the `InventoryVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryVariant` DROP COLUMN `depUid`,
    DROP COLUMN `prodUid`,
    ADD COLUMN `uid` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `InventoryVariant_uid_key` ON `InventoryVariant`(`uid`);
