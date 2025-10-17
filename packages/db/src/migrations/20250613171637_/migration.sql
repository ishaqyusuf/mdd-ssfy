-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CustomerTransaction` ADD COLUMN `statusNote` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CustomerTransactionStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `authorName` VARCHAR(191) NULL,
    `authorId` INTEGER NOT NULL,
    `status` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `transactionId` INTEGER NOT NULL,

    UNIQUE INDEX `CustomerTransactionStatus_id_key`(`id`),
    INDEX `CustomerTransactionStatus_transactionId_idx`(`transactionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
