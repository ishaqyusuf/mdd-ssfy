/*
  Warnings:

  - Added the required column `status` to the `CommunityModelInstallTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityModelInstallTask` ADD COLUMN `status` ENUM('active', 'inactive') NOT NULL;

-- AlterTable
ALTER TABLE `HomeTasks` ADD COLUMN `builderTaskId` INTEGER NULL;

-- CreateTable
CREATE TABLE `JobHomeTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `homeTaskId` INTEGER NOT NULL,
    `addonTotal` DOUBLE NULL,
    `taskTotal` DOUBLE NULL,
    `grandTotal` DOUBLE NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `JobHomeTask_id_key`(`id`),
    INDEX `JobHomeTask_jobId_idx`(`jobId`),
    INDEX `JobHomeTask_homeTaskId_idx`(`homeTaskId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobInstallTasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `qty` DOUBLE NULL,
    `rate` DOUBLE NULL,
    `total` DOUBLE NULL,
    `jobHomeTaskId` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `communityModelInstallTaskId` INTEGER NULL,

    UNIQUE INDEX `JobInstallTasks_id_key`(`id`),
    INDEX `JobInstallTasks_jobId_idx`(`jobId`),
    INDEX `JobInstallTasks_jobHomeTaskId_idx`(`jobHomeTaskId`),
    INDEX `JobInstallTasks_communityModelInstallTaskId_idx`(`communityModelInstallTaskId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
