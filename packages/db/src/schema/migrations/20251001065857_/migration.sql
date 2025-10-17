-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityModelTemplateValue` ADD COLUMN `communityTemplateHistoryId` INTEGER NULL;

-- AlterTable
ALTER TABLE `CommunityTemplateHistory` ADD COLUMN `slug` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CommunityModelHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,

    UNIQUE INDEX `CommunityModelHistory_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CommunityModelTemplateValue_communityTemplateHistoryId_idx` ON `CommunityModelTemplateValue`(`communityTemplateHistoryId`);
