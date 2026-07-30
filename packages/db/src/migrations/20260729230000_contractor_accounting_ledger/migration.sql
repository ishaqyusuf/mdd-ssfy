-- CreateTable
CREATE TABLE `ContractorLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `contractorId` INTEGER NOT NULL,
    `type` ENUM('OPENING_BALANCE', 'JOB_EARNED', 'BONUS', 'EXPENSE', 'DEDUCTION', 'PAYOUT', 'REVERSAL') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `liabilityDelta` DECIMAL(18, 2) NOT NULL,
    `effectiveAt` DATETIME(3) NOT NULL,
    `postedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sourceType` ENUM('JOB', 'PAYMENT', 'PAYMENT_ADJUSTMENT', 'MANUAL_ADJUSTMENT', 'OPENING_BALANCE', 'MIGRATION') NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `sourceKey` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `jobId` INTEGER NULL,
    `paymentId` INTEGER NULL,
    `paymentAdjustmentId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `reversalOfId` VARCHAR(191) NULL,
    `evidence` JSON NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ContractorLedgerEntry_sourceKey_key`(`sourceKey`),
    UNIQUE INDEX `ContractorLedgerEntry_reversalOfId_key`(`reversalOfId`),
    INDEX `ContractorLedgerEntry_contractorId_effectiveAt_id_idx`(`contractorId`, `effectiveAt`, `id`),
    INDEX `ContractorLedgerEntry_effectiveAt_id_idx`(`effectiveAt`, `id`),
    INDEX `ContractorLedgerEntry_type_effectiveAt_idx`(`type`, `effectiveAt`),
    INDEX `ContractorLedgerEntry_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `ContractorLedgerEntry_jobId_idx`(`jobId`),
    INDEX `ContractorLedgerEntry_paymentId_idx`(`paymentId`),
    INDEX `ContractorLedgerEntry_paymentAdjustmentId_idx`(`paymentAdjustmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorAccountingPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `from` DATETIME(3) NOT NULL,
    `toExclusive` DATETIME(3) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `closingBalance` DECIMAL(18, 2) NULL,
    `snapshot` JSON NULL,
    `snapshotHash` VARCHAR(64) NULL,
    `closedAt` DATETIME(3) NULL,
    `closedById` INTEGER NULL,
    `reopenedAt` DATETIME(3) NULL,
    `reopenedById` INTEGER NULL,
    `reopenReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContractorAccountingPeriod_status_from_toExclusive_idx`(`status`, `from`, `toExclusive`),
    UNIQUE INDEX `ContractorAccountingPeriod_from_toExclusive_timezone_key`(`from`, `toExclusive`, `timezone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorAccountingPeriodEvent` (
    `id` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `type` ENUM('CLOSED', 'REOPENED') NOT NULL,
    `actorId` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `snapshot` JSON NULL,
    `snapshotHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContractorAccountingPeriodEvent_periodId_createdAt_idx`(`periodId`, `createdAt`),
    INDEX `ContractorAccountingPeriodEvent_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorReconciliationRun` (
    `id` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NULL,
    `from` DATETIME(3) NOT NULL,
    `toExclusive` DATETIME(3) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'MATCHED', 'ISSUES_FOUND', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `sourceTotals` JSON NULL,
    `ledgerTotals` JSON NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `requestedById` INTEGER NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContractorReconciliationRun_from_toExclusive_createdAt_idx`(`from`, `toExclusive`, `createdAt`),
    INDEX `ContractorReconciliationRun_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorReconciliationIssue` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `contractorId` INTEGER NULL,
    `ledgerEntryId` VARCHAR(191) NULL,
    `code` ENUM('SUMMARY_MISMATCH', 'CONTRACTOR_MISMATCH', 'MISSING_SOURCE', 'DUPLICATE_SOURCE', 'LEGACY_DATE_FALLBACK', 'MISSING_EFFECTIVE_DATE') NOT NULL,
    `status` ENUM('OPEN', 'REVIEWED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `message` TEXT NOT NULL,
    `expectedAmount` DECIMAL(18, 2) NULL,
    `actualAmount` DECIMAL(18, 2) NULL,
    `differenceAmount` DECIMAL(18, 2) NULL,
    `evidence` JSON NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` INTEGER NULL,
    `resolutionNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContractorReconciliationIssue_runId_status_idx`(`runId`, `status`),
    INDEX `ContractorReconciliationIssue_contractorId_status_idx`(`contractorId`, `status`),
    INDEX `ContractorReconciliationIssue_ledgerEntryId_idx`(`ledgerEntryId`),
    INDEX `ContractorReconciliationIssue_code_status_idx`(`code`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorAccountingReportSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('CONSOLIDATED', 'CONTRACTOR_STATEMENT', 'AGING', 'RECONCILIATION', 'ADJUSTMENT_REGISTER', 'TAX_READINESS') NOT NULL,
    `format` ENUM('PDF', 'XLSX', 'CSV') NOT NULL,
    `cron` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `filters` JSON NOT NULL,
    `recipients` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `nextRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContractorAccountingReportSchedule_enabled_nextRunAt_idx`(`enabled`, `nextRunAt`),
    INDEX `ContractorAccountingReportSchedule_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorAccountingReportRun` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NULL,
    `kind` ENUM('CONSOLIDATED', 'CONTRACTOR_STATEMENT', 'AGING', 'RECONCILIATION', 'ADJUSTMENT_REGISTER', 'TAX_READINESS') NOT NULL,
    `format` ENUM('PDF', 'XLSX', 'CSV') NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `contractorId` INTEGER NULL,
    `filters` JSON NOT NULL,
    `totals` JSON NULL,
    `outputUrl` TEXT NULL,
    `contentHash` VARCHAR(64) NULL,
    `requestedById` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContractorAccountingReportRun_requestedById_createdAt_idx`(`requestedById`, `createdAt`),
    INDEX `ContractorAccountingReportRun_contractorId_createdAt_idx`(`contractorId`, `createdAt`),
    INDEX `ContractorAccountingReportRun_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `ContractorAccountingReportRun_scheduleId_createdAt_idx`(`scheduleId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractorTaxProfile` (
    `id` VARCHAR(191) NOT NULL,
    `contractorId` INTEGER NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `taxClassification` VARCHAR(64) NULL,
    `w9Status` ENUM('NOT_REQUESTED', 'REQUESTED', 'RECEIVED', 'VERIFIED', 'EXPIRED') NOT NULL DEFAULT 'NOT_REQUESTED',
    `w9RequestedAt` DATETIME(3) NULL,
    `w9ReceivedAt` DATETIME(3) NULL,
    `w9VerifiedAt` DATETIME(3) NULL,
    `w9VerifiedById` INTEGER NULL,
    `tinLastFour` VARCHAR(4) NULL,
    `documentId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContractorTaxProfile_contractorId_key`(`contractorId`),
    INDEX `ContractorTaxProfile_w9Status_contractorId_idx`(`w9Status`, `contractorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
