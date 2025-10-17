-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `CommunityTemplateBlockConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `index` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `CommunityTemplateBlockConfig_id_key`(`id`),
    UNIQUE INDEX `CommunityTemplateBlockConfig_uid_key`(`uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityTemplateInputConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `index` DOUBLE NOT NULL DEFAULT 0,
    `columnSize` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `communityTemplateBlockConfigId` INTEGER NOT NULL,

    UNIQUE INDEX `CommunityTemplateInputConfig_id_key`(`id`),
    INDEX `CommunityTemplateInputConfig_communityTemplateBlockConfigId_idx`(`communityTemplateBlockConfigId`),
    UNIQUE INDEX `CommunityTemplateInputConfig_uid_communityTemplateBlockConfi_key`(`uid`, `communityTemplateBlockConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeProductsMetric` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `selectionCount` DOUBLE NULL,
    `qty` DOUBLE NULL,
    `salesPrice` DOUBLE NULL,
    `costPrice` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeProductsMetric_id_key`(`id`),
    UNIQUE INDEX `DykeProductsMetric_productId_key`(`productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
