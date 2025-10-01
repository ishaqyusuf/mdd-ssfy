/*
  Warnings:

  - You are about to drop the `CommunityTemplateModelInput` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- DropTable
DROP TABLE `CommunityTemplateModelInput`;

-- CreateTable
CREATE TABLE `CommunityModelTemplateValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `value` DOUBLE NULL DEFAULT 1,
    `communityModelId` INTEGER NOT NULL,
    `inventoryCategoryId` INTEGER NULL,
    `inputConfigId` INTEGER NOT NULL,
    `inventoryId` INTEGER NULL,

    UNIQUE INDEX `CommunityModelTemplateValue_id_key`(`id`),
    INDEX `CommunityModelTemplateValue_communityModelId_idx`(`communityModelId`),
    INDEX `CommunityModelTemplateValue_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `CommunityModelTemplateValue_inventoryId_idx`(`inventoryId`),
    INDEX `CommunityModelTemplateValue_inputConfigId_idx`(`inputConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
