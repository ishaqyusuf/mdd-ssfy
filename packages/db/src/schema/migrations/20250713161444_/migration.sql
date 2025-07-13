/*
  Warnings:

  - Added the required column `option` to the `SquarePaymentLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `SquarePaymentLink` ADD COLUMN `option` VARCHAR(191) NOT NULL;
