-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityAnalyticAttributes` ADD COLUMN `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `deletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `CommunityHomeAnalytics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inputConfigId` INTEGER NULL,
    `homeId` INTEGER NULL,
    `templateValueId` INTEGER NULL,
    `blockConfigId` INTEGER NULL,

    UNIQUE INDEX `CommunityHomeAnalytics_id_key`(`id`),
    INDEX `CommunityHomeAnalytics_inputConfigId_idx`(`inputConfigId`),
    INDEX `CommunityHomeAnalytics_homeId_idx`(`homeId`),
    INDEX `CommunityHomeAnalytics_templateValueId_idx`(`templateValueId`),
    INDEX `CommunityHomeAnalytics_blockConfigId_idx`(`blockConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
