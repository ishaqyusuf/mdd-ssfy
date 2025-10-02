/*
  Warnings:

  - Added the required column `uid` to the `CommunityModelTemplateValue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityModelTemplateValue` ADD COLUMN `uid` VARCHAR(191) NOT NULL;
