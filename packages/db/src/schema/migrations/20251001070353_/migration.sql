/*
  Warnings:

  - You are about to drop the column `communityModelsId` on the `CommunityTemplateHistory` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `CommunityTemplateHistory_communityModelsId_idx` ON `CommunityTemplateHistory`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityModelTemplateValue` ADD COLUMN `homeTemplateId` INTEGER NULL;

-- AlterTable
ALTER TABLE `CommunityTemplateHistory` DROP COLUMN `communityModelsId`,
    ADD COLUMN `communityModelId` INTEGER NULL,
    ADD COLUMN `homeTemplateId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `CommunityModelTemplateValue_homeTemplateId_idx` ON `CommunityModelTemplateValue`(`homeTemplateId`);

-- CreateIndex
CREATE INDEX `CommunityTemplateHistory_communityModelId_idx` ON `CommunityTemplateHistory`(`communityModelId`);

-- CreateIndex
CREATE INDEX `CommunityTemplateHistory_homeTemplateId_idx` ON `CommunityTemplateHistory`(`homeTemplateId`);
