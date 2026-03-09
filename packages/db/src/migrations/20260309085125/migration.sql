-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `ScheduleHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventName` VARCHAR(255) NOT NULL,
    `value` DOUBLE NOT NULL DEFAULT 0,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `ScheduleHistory_eventName_createdAt_idx`(`eventName`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
