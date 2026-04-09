-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `OrderProductionGate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NOT NULL,
    `status` ENUM('missing', 'defined', 'triggered') NOT NULL DEFAULT 'missing',
    `ruleType` ENUM('fully_paid', 'half_paid', 'lead_time_before_delivery') NULL,
    `leadTimeValue` INTEGER NULL,
    `leadTimeUnit` ENUM('day', 'week') NULL,
    `definedAt` TIMESTAMP(0) NULL,
    `definedByUserId` INTEGER NULL,
    `triggeredAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `OrderProductionGate_id_key`(`id`),
    UNIQUE INDEX `OrderProductionGate_salesOrderId_key`(`salesOrderId`),
    INDEX `OrderProductionGate_definedByUserId_idx`(`definedByUserId`),
    INDEX `OrderProductionGate_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
