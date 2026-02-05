-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `BuilderTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `builderId` INTEGER NOT NULL,
    `taskName` VARCHAR(255) NOT NULL,
    `taskUid` VARCHAR(255) NOT NULL,
    `billable` BOOLEAN NULL,
    `productionable` BOOLEAN NULL,
    `installable` BOOLEAN NULL,
    `addonPercentage` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `BuilderTask_id_key`(`id`),
    INDEX `BuilderTask_builderId_idx`(`builderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstallCostModel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `unit` VARCHAR(255) NULL,
    `unitCost` DOUBLE NULL,
    `status` ENUM('active', 'inactive') NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `InstallCostModel_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityModelInstallTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communityModelId` INTEGER NOT NULL,
    `installCostModelId` INTEGER NOT NULL,
    `qty` DOUBLE NULL,
    `totalCost` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `builderTaskId` INTEGER NULL,

    UNIQUE INDEX `CommunityModelInstallTask_id_key`(`id`),
    INDEX `CommunityModelInstallTask_communityModelId_idx`(`communityModelId`),
    INDEX `CommunityModelInstallTask_installCostModelId_idx`(`installCostModelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
