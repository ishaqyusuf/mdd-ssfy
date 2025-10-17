-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityTemplateInputConfig` ADD COLUMN `attrId` INTEGER NULL;

-- CreateTable
CREATE TABLE `CommunityAnalyticAttributes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inputConfigId` INTEGER NULL,
    `attrInputId` INTEGER NULL,
    `communityTemplateInputConfigId` INTEGER NULL,

    UNIQUE INDEX `CommunityAnalyticAttributes_id_key`(`id`),
    INDEX `CommunityAnalyticAttributes_inputConfigId_idx`(`inputConfigId`),
    INDEX `CommunityAnalyticAttributes_communityTemplateInputConfigId_idx`(`communityTemplateInputConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
