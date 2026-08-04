-- CreateTable
CREATE TABLE `SalesOrderAdjustment` (
    `id` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `direction` ENUM('INCREASE', 'REDUCTION', 'MIXED') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_CUSTOMER', 'APPROVED', 'APPLYING', 'APPLIED', 'APPLIED_WITH_REVIEW', 'REJECTED', 'EXPIRED', 'CANCELLED', 'STALE', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `sourceVersion` VARCHAR(191) NULL,
    `sourceHash` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `beforeSnapshot` JSON NOT NULL,
    `proposedSnapshot` JSON NOT NULL,
    `commitmentSnapshot` JSON NOT NULL,
    `settlementSnapshot` JSON NULL,
    `beforeGrandTotal` DECIMAL(12, 2) NOT NULL,
    `proposedGrandTotal` DECIMAL(12, 2) NOT NULL,
    `paymentTotal` DECIMAL(12, 2) NOT NULL,
    `amountDueAfter` DECIMAL(12, 2) NOT NULL,
    `walletCreditAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `requestedById` INTEGER NOT NULL,
    `submittedById` INTEGER NULL,
    `appliedById` INTEGER NULL,
    `walletTransactionId` INTEGER NULL,
    `refundSalesPaymentId` INTEGER NULL,
    `paymentLedgerEntryId` VARCHAR(191) NULL,
    `failureCode` VARCHAR(100) NULL,
    `failureMessage` TEXT NULL,
    `submittedAt` TIMESTAMP(0) NULL,
    `approvedAt` TIMESTAMP(0) NULL,
    `appliedAt` TIMESTAMP(0) NULL,
    `cancelledAt` TIMESTAMP(0) NULL,
    `failedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesOrderAdjustment_idempotencyKey_key`(`idempotencyKey`),
    INDEX `SalesOrderAdjustment_salesOrderId_status_createdAt_idx`(`salesOrderId`, `status`, `createdAt`),
    INDEX `SalesOrderAdjustment_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `SalesOrderAdjustment_requestedById_createdAt_idx`(`requestedById`, `createdAt`),
    INDEX `SalesOrderAdjustment_walletTransactionId_idx`(`walletTransactionId`),
    INDEX `SalesOrderAdjustment_refundSalesPaymentId_idx`(`refundSalesPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrderAdjustmentLine` (
    `id` VARCHAR(191) NOT NULL,
    `adjustmentId` VARCHAR(191) NOT NULL,
    `lineUid` VARCHAR(191) NOT NULL,
    `salesOrderItemId` INTEGER NULL,
    `title` VARCHAR(300) NOT NULL,
    `beforeQty` DECIMAL(12, 3) NOT NULL,
    `proposedQty` DECIMAL(12, 3) NOT NULL,
    `quantityDelta` DECIMAL(12, 3) NOT NULL,
    `beforeLineTotal` DECIMAL(12, 2) NOT NULL,
    `proposedLineTotal` DECIMAL(12, 2) NOT NULL,
    `lineTotalDelta` DECIMAL(12, 2) NOT NULL,
    `commitmentSnapshot` JSON NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalesOrderAdjustmentLine_salesOrderItemId_idx`(`salesOrderItemId`),
    UNIQUE INDEX `SalesOrderAdjustmentLine_adjustmentId_lineUid_key`(`adjustmentId`, `lineUid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrderAdjustmentApproval` (
    `id` VARCHAR(191) NOT NULL,
    `adjustmentId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `tokenHash` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(50) NULL,
    `recipient` VARCHAR(255) NULL,
    `responseNote` TEXT NULL,
    `evidence` JSON NULL,
    `expiresAt` TIMESTAMP(0) NOT NULL,
    `respondedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesOrderAdjustmentApproval_tokenHash_key`(`tokenHash`),
    INDEX `SalesOrderAdjustmentApproval_adjustmentId_status_idx`(`adjustmentId`, `status`),
    INDEX `SalesOrderAdjustmentApproval_status_expiresAt_idx`(`status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
