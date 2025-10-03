/*
  Warnings:

  - You are about to drop the column `communityTemplateHistoryId` on the `CommunityModelTemplateValue` table. All the data in the column will be lost.
  - You are about to drop the column `homeTemplateId` on the `CommunityModelTemplateValue` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `CommunityModelTemplateValue_communityTemplateHistoryId_idx` ON `CommunityModelTemplateValue`;

-- DropIndex
DROP INDEX `CommunityModelTemplateValue_homeTemplateId_idx` ON `CommunityModelTemplateValue`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityModelTemplateValue` DROP COLUMN `communityTemplateHistoryId`,
    DROP COLUMN `homeTemplateId`,
    ADD COLUMN `communityModelHistoryId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `CommunityModelTemplateValue_communityModelHistoryId_idx` ON `CommunityModelTemplateValue`(`communityModelHistoryId`);
