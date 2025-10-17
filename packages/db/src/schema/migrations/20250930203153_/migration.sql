/*
  Warnings:

  - You are about to drop the column `c` on the `CommunityTemplateInputConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityTemplateInputConfig` DROP COLUMN `c`;
