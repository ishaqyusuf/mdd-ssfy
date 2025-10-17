/*
  Warnings:

  - Added the required column `sectionTitle` to the `SalesTakeOffTemplates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `SalesTakeOffTemplates` ADD COLUMN `sectionTitle` VARCHAR(191) NOT NULL;
