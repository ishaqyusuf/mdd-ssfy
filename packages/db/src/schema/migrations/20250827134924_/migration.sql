/*
  Warnings:

  - Made the column `subComponentId` on table `LineItemComponents` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItemComponents` MODIFY `subComponentId` INTEGER NOT NULL;
