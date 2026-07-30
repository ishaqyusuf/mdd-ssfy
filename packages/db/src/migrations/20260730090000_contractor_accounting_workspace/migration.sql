-- CreateTable
CREATE TABLE `ContractorPayoutRun` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'READY', 'HANDED_OFF', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `contractorId` INTEGER NOT NULL,
    `jobIds` JSON NOT NULL,
    `filters` JSON NULL,
    `proposedAmount` DECIMAL(18, 2) NOT NULL,
    `snapshot` JSON NOT NULL,
    `snapshotHash` VARCHAR(64) NOT NULL,
    `note` TEXT NULL,
    `createdById` INTEGER NOT NULL,
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `handedOffAt` DATETIME(3) NULL,
    `paymentId` INTEGER NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelledById` INTEGER NULL,
    `cancellationReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContractorPayoutRun_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `ContractorPayoutRun_contractorId_status_createdAt_idx`(`contractorId`, `status`, `createdAt`),
    INDEX `ContractorPayoutRun_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `ContractorPayoutRun_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorAccountingAlertRule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('BALANCE_THRESHOLD', 'LIABILITY_AGE', 'RECONCILIATION_STALE', 'W9_BLOCKER', 'PERIOD_CLOSE') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `contractorId` INTEGER NULL,
    `thresholdAmount` DECIMAL(18, 2) NULL,
    `thresholdDays` INTEGER NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `recipients` JSON NOT NULL,
    `filters` JSON NULL,
    `createdById` INTEGER NOT NULL,
    `lastEvaluatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContractorAccountingAlertRule_enabled_kind_idx`(`enabled`, `kind`),
    INDEX `ContractorAccountingAlertRule_contractorId_enabled_idx`(`contractorId`, `enabled`),
    INDEX `ContractorAccountingAlertRule_createdById_createdAt_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorAccountingAlertEvent` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `contractorId` INTEGER NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `evidence` JSON NOT NULL,
    `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acknowledgedAt` DATETIME(3) NULL,
    `acknowledgedById` INTEGER NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContractorAccountingAlertEvent_status_triggeredAt_idx`(`status`, `triggeredAt`),
    INDEX `ContractorAccountingAlertEvent_contractorId_status_idx`(`contractorId`, `status`),
    UNIQUE INDEX `ContractorAccountingAlertEvent_ruleId_fingerprint_key`(`ruleId`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
