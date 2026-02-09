-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `BuilderTaskInstallCost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `builderTaskId` INTEGER NOT NULL,
    `installCostModelId` INTEGER NOT NULL,
    `defaultQty` DOUBLE NULL,
    `totalCost` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',

    UNIQUE INDEX `BuilderTaskInstallCost_id_key`(`id`),
    INDEX `BuilderTaskInstallCost_builderTaskId_idx`(`builderTaskId`),
    INDEX `BuilderTaskInstallCost_installCostModelId_idx`(`installCostModelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
