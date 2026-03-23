-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `StoredDocument` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(100) NOT NULL,
    `ownerType` VARCHAR(100) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `ownerKey` VARCHAR(191) NULL,
    `provider` VARCHAR(100) NOT NULL,
    `pathname` VARCHAR(512) NOT NULL,
    `url` VARCHAR(512) NULL,
    `filename` VARCHAR(255) NULL,
    `mimeType` VARCHAR(255) NULL,
    `extension` VARCHAR(50) NULL,
    `size` INTEGER NULL,
    `checksum` VARCHAR(191) NULL,
    `visibility` VARCHAR(50) NOT NULL DEFAULT 'private',
    `status` VARCHAR(50) NOT NULL DEFAULT 'ready',
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `generated` BOOLEAN NOT NULL DEFAULT false,
    `sourceType` VARCHAR(100) NULL,
    `sourceId` VARCHAR(191) NULL,
    `uploadedBy` INTEGER NULL,
    `title` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `StoredDocument_ownerType_ownerId_kind_status_idx`(`ownerType`, `ownerId`, `kind`, `status`),
    INDEX `StoredDocument_ownerType_ownerId_kind_isCurrent_idx`(`ownerType`, `ownerId`, `kind`, `isCurrent`),
    INDEX `StoredDocument_kind_status_updatedAt_idx`(`kind`, `status`, `updatedAt`),
    INDEX `StoredDocument_provider_pathname_idx`(`provider`, `pathname`),
    INDEX `StoredDocument_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `StoredDocument_uploadedBy_idx`(`uploadedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesDocumentSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `storedDocumentId` VARCHAR(191) NULL,
    `documentType` VARCHAR(100) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `generationStatus` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `reason` VARCHAR(100) NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `sourceUpdatedAt` TIMESTAMP(0) NULL,
    `generatedAt` TIMESTAMP(0) NULL,
    `invalidatedAt` TIMESTAMP(0) NULL,
    `failedAt` TIMESTAMP(0) NULL,
    `errorMessage` TEXT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `SalesDocumentSnapshot_salesOrderId_documentType_isCurrent_idx`(`salesOrderId`, `documentType`, `isCurrent`),
    INDEX `SalesDocumentSnapshot_storedDocumentId_idx`(`storedDocumentId`),
    INDEX `SalesDocumentSnapshot_generationStatus_updatedAt_idx`(`generationStatus`, `updatedAt`),
    UNIQUE INDEX `SalesDocumentSnapshot_salesOrderId_documentType_version_key`(`salesOrderId`, `documentType`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `entryType` VARCHAR(100) NOT NULL,
    `status` VARCHAR(100) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `idempotencyKey` VARCHAR(191) NULL,
    `occurredAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `salesOrderId` INTEGER NULL,
    `walletId` INTEGER NULL,
    `customerTxId` INTEGER NULL,
    `salesPaymentId` INTEGER NULL,
    `squarePaymentId` VARCHAR(191) NULL,
    `checkoutId` VARCHAR(191) NULL,
    `refundId` VARCHAR(191) NULL,
    `authorId` INTEGER NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `PaymentLedgerEntry_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PaymentLedgerEntry_entryType_status_occurredAt_idx`(`entryType`, `status`, `occurredAt`),
    INDEX `PaymentLedgerEntry_salesOrderId_occurredAt_idx`(`salesOrderId`, `occurredAt`),
    INDEX `PaymentLedgerEntry_walletId_occurredAt_idx`(`walletId`, `occurredAt`),
    INDEX `PaymentLedgerEntry_customerTxId_idx`(`customerTxId`),
    INDEX `PaymentLedgerEntry_salesPaymentId_idx`(`salesPaymentId`),
    INDEX `PaymentLedgerEntry_squarePaymentId_idx`(`squarePaymentId`),
    INDEX `PaymentLedgerEntry_checkoutId_idx`(`checkoutId`),
    INDEX `PaymentLedgerEntry_refundId_idx`(`refundId`),
    INDEX `PaymentLedgerEntry_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `ledgerEntryId` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `allocationType` VARCHAR(100) NOT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `PaymentAllocation_ledgerEntryId_idx`(`ledgerEntryId`),
    INDEX `PaymentAllocation_salesOrderId_idx`(`salesOrderId`),
    INDEX `PaymentAllocation_allocationType_createdAt_idx`(`allocationType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentProjection` (
    `salesOrderId` INTEGER NOT NULL,
    `totalRecorded` DOUBLE NOT NULL DEFAULT 0,
    `totalAllocated` DOUBLE NOT NULL DEFAULT 0,
    `totalRefunded` DOUBLE NOT NULL DEFAULT 0,
    `totalVoided` DOUBLE NOT NULL DEFAULT 0,
    `amountDue` DOUBLE NOT NULL DEFAULT 0,
    `projectionState` VARCHAR(50) NOT NULL DEFAULT 'active',
    `version` INTEGER NOT NULL DEFAULT 0,
    `lastSyncedAt` TIMESTAMP(0) NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    INDEX `PaymentProjection_projectionState_updatedAt_idx`(`projectionState`, `updatedAt`),
    INDEX `PaymentProjection_lastSyncedAt_idx`(`lastSyncedAt`),
    PRIMARY KEY (`salesOrderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResolutionCase` (
    `id` VARCHAR(191) NOT NULL,
    `scopeType` VARCHAR(100) NOT NULL,
    `scopeId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'open',
    `summary` LONGTEXT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `ResolutionCase_scopeType_scopeId_status_idx`(`scopeType`, `scopeId`, `status`),
    INDEX `ResolutionCase_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResolutionFinding` (
    `id` VARCHAR(191) NOT NULL,
    `resolutionCaseId` VARCHAR(191) NOT NULL,
    `findingType` VARCHAR(100) NOT NULL,
    `severity` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'open',
    `snapshot` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `ResolutionFinding_resolutionCaseId_idx`(`resolutionCaseId`),
    INDEX `ResolutionFinding_findingType_severity_status_idx`(`findingType`, `severity`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResolutionAction` (
    `id` VARCHAR(191) NOT NULL,
    `resolutionCaseId` VARCHAR(191) NOT NULL,
    `actionType` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `actorId` INTEGER NULL,
    `beforeState` JSON NULL,
    `afterState` JSON NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `ResolutionAction_resolutionCaseId_idx`(`resolutionCaseId`),
    INDEX `ResolutionAction_actionType_status_createdAt_idx`(`actionType`, `status`, `createdAt`),
    INDEX `ResolutionAction_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResolutionRun` (
    `id` VARCHAR(191) NOT NULL,
    `runType` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `startedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `completedAt` TIMESTAMP(0) NULL,
    `summary` LONGTEXT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    INDEX `ResolutionRun_runType_status_startedAt_idx`(`runType`, `status`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
