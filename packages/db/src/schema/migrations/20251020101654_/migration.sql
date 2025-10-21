/*
  Warnings:

  - A unique constraint covering the columns `[refundId]` on the table `SquareRefunds` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `SquareRefunds` ADD COLUMN `refundId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SquareRefunds_refundId_key` ON `SquareRefunds`(`refundId`);
