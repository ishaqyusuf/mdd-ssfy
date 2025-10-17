-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `SalesHistory` (
    `id` VARCHAR(191) NOT NULL,
    `data` JSON NULL,
    `name` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NULL,
    `salesId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SalesHistory_id_key`(`id`),
    INDEX `SalesHistory_salesId_idx`(`salesId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
