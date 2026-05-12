-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `SalesPrintData` (
    `id` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `documentType` VARCHAR(100) NOT NULL,
    `templateId` VARCHAR(100) NOT NULL DEFAULT 'template-2',
    `mode` VARCHAR(50) NOT NULL,
    `dispatchId` INTEGER NULL,
    `scopeKey` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `firstOrderId` VARCHAR(191) NULL,
    `companyAddress` JSON NOT NULL,
    `pages` JSON NOT NULL,
    `sourceUpdatedAt` TIMESTAMP(0) NULL,
    `generatedAt` TIMESTAMP(0) NULL,
    `invalidatedAt` TIMESTAMP(0) NULL,
    `failedAt` TIMESTAMP(0) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ready',
    `reason` VARCHAR(100) NULL,
    `errorMessage` TEXT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `SalesPrintData_salesOrderId_status_idx`(`salesOrderId`, `status`),
    INDEX `SalesPrintData_status_updatedAt_idx`(`status`, `updatedAt`),
    UNIQUE INDEX `SalesPrintData_salesOrderId_documentType_templateId_key`(`salesOrderId`, `documentType`, `templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
