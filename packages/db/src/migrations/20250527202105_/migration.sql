/*
  Warnings:

  - You are about to drop the column `sectionTitle` on the `SalesTakeOffTemplates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `SalesTakeOffTemplates` DROP COLUMN `sectionTitle`;
