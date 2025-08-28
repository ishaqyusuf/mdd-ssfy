/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Customers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Customers` ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Customers_userId_key` ON `Customers`(`userId`);
