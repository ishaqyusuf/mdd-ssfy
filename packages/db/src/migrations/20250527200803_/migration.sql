-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `SalesTakeOffTemplates` (
    `id` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SalesTakeOffTemplates_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
