/*
  Warnings:

  - You are about to drop the column `section` on the `SalesTakeOffTemplates` table. All the data in the column will be lost.
  - Added the required column `sectionUid` to the `SalesTakeOffTemplates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `SalesTakeOffTemplates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `SalesTakeOffTemplates` DROP COLUMN `section`,
    ADD COLUMN `sectionUid` VARCHAR(191) NOT NULL,
    ADD COLUMN `title` VARCHAR(191) NOT NULL;
