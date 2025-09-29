-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `CommunityTemplateModelInput` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `value` DOUBLE NULL DEFAULT 1,
    `communityModelId` INTEGER NOT NULL,
    `inventoryCategoryId` INTEGER NULL,
    `inputConfigId` INTEGER NOT NULL,
    `inventoryId` INTEGER NULL,

    UNIQUE INDEX `CommunityTemplateModelInput_id_key`(`id`),
    INDEX `CommunityTemplateModelInput_communityModelId_idx`(`communityModelId`),
    INDEX `CommunityTemplateModelInput_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `CommunityTemplateModelInput_inventoryId_idx`(`inventoryId`),
    INDEX `CommunityTemplateModelInput_inputConfigId_idx`(`inputConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
