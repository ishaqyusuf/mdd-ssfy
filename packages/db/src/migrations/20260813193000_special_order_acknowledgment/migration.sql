-- AlterTable
ALTER TABLE `SalesOrders` ADD COLUMN `currentSpecialOrderApprovalId` VARCHAR(191) NULL,
    ADD COLUMN `currentSpecialOrderRequestId` VARCHAR(191) NULL,
    ADD COLUMN `specialOrderDeclaration` ENUM('NO', 'YES') NULL,
    ADD COLUMN `specialOrderRevision` VARCHAR(64) NULL,
    ADD COLUMN `specialOrderStatus` ENUM('NOT_REQUIRED', 'SIGNATURE_PENDING', 'CUSTOMER_APPROVED', 'REAPPROVAL_REQUIRED', 'CUSTOMER_DECLINED') NULL;

-- CreateTable
CREATE TABLE `SpecialOrderPolicyVersion` (
    `id` VARCHAR(191) NOT NULL,
    `version` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
    `title` VARCHAR(255) NOT NULL,
    `acknowledgmentText` TEXT NOT NULL,
    `policyText` TEXT NOT NULL,
    `createdByUserId` INTEGER NULL,
    `publishedByUserId` INTEGER NULL,
    `publishedAt` TIMESTAMP(0) NULL,
    `retiredAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SpecialOrderPolicyVersion_version_key`(`version`),
    INDEX `SpecialOrderPolicyVersion_status_version_idx`(`status`, `version`),
    INDEX `SpecialOrderPolicyVersion_publishedAt_idx`(`publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecialOrderApprovalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `policyVersionId` VARCHAR(191) NOT NULL,
    `orderRevision` VARCHAR(64) NOT NULL,
    `status` ENUM('ACTIVE', 'CONSUMED', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `tokenHash` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `sentToEmail` VARCHAR(255) NOT NULL,
    `orderSnapshot` JSON NULL,
    `customerSnapshot` JSON NULL,
    `salespersonSnapshot` JSON NULL,
    `sentAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deliveredAt` TIMESTAMP(0) NULL,
    `deliveryStatus` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `lastDeliveryError` TEXT NULL,
    `expiresAt` TIMESTAMP(0) NOT NULL,
    `consumedAt` TIMESTAMP(0) NULL,
    `revokedAt` TIMESTAMP(0) NULL,
    `revokedReason` VARCHAR(255) NULL,
    `issuedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SpecialOrderApprovalRequest_tokenHash_key`(`tokenHash`),
    UNIQUE INDEX `SpecialOrderApprovalRequest_idempotencyKey_key`(`idempotencyKey`),
    INDEX `SpecialOrderApprovalRequest_salesOrderId_status_createdAt_idx`(`salesOrderId`, `status`, `createdAt`),
    INDEX `SpecialOrderApprovalRequest_expiresAt_status_idx`(`expiresAt`, `status`),
    INDEX `SpecialOrderApprovalRequest_policyVersionId_idx`(`policyVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecialOrderApprovalEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `policyVersionId` VARCHAR(191) NOT NULL,
    `orderRevision` VARCHAR(64) NOT NULL,
    `outcome` ENUM('APPROVED', 'DECLINED') NOT NULL,
    `customerName` VARCHAR(255) NOT NULL,
    `customerEmail` VARCHAR(255) NOT NULL,
    `declineReason` TEXT NULL,
    `signatureDocumentId` VARCHAR(191) NULL,
    `policyTitle` VARCHAR(255) NOT NULL,
    `acknowledgmentText` TEXT NOT NULL,
    `policyText` TEXT NOT NULL,
    `orderSnapshot` JSON NOT NULL,
    `customerSnapshot` JSON NOT NULL,
    `salespersonSnapshot` JSON NOT NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` TEXT NULL,
    `acknowledgedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `supersededAt` TIMESTAMP(0) NULL,
    `supersededReason` TEXT NULL,
    `supersededByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `SpecialOrderApprovalEvidence_requestId_key`(`requestId`),
    INDEX `SpecialOrderApprovalEvidence_salesOrderId_acknowledgedAt_idx`(`salesOrderId`, `acknowledgedAt`),
    INDEX `SpecialOrderApprovalEvidence_policyVersionId_idx`(`policyVersionId`),
    INDEX `SpecialOrderApprovalEvidence_signatureDocumentId_idx`(`signatureDocumentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecialOrderNotificationDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `eventKey` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `eventType` VARCHAR(64) NOT NULL,
    `customerStatus` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `staffStatus` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `inAppStatus` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `payload` JSON NOT NULL,
    `lastError` TEXT NULL,
    `lastAttemptAt` TIMESTAMP(0) NULL,
    `completedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SpecialOrderNotificationDelivery_eventKey_key`(`eventKey`),
    INDEX `SpecialOrderNotificationDelivery_salesOrderId_createdAt_idx`(`salesOrderId`, `createdAt`),
    INDEX `SpecialOrderNotificationDelivery_customerStatus_staffStatus__idx`(`customerStatus`, `staffStatus`, `inAppStatus`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecialOrderOperationEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventKey` VARCHAR(191) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `orderRevision` VARCHAR(64) NULL,
    `operation` VARCHAR(32) NOT NULL,
    `enforcementMode` VARCHAR(64) NOT NULL,
    `result` VARCHAR(32) NOT NULL,
    `source` VARCHAR(191) NULL,
    `actorUserId` INTEGER NULL,
    `meta` JSON NULL,
    `occurredAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `SpecialOrderOperationEvent_eventKey_key`(`eventKey`),
    INDEX `SpecialOrderOperationEvent_salesOrderId_occurredAt_idx`(`salesOrderId`, `occurredAt`),
    INDEX `SpecialOrderOperationEvent_result_operation_occurredAt_idx`(`result`, `operation`, `occurredAt`),
    INDEX `SpecialOrderOperationEvent_enforcementMode_occurredAt_idx`(`enforcementMode`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `SalesOrders_currentSpecialOrderApprovalId_key` ON `SalesOrders`(`currentSpecialOrderApprovalId`);

-- CreateIndex
CREATE INDEX `SalesOrders_specialOrderDeclaration_specialOrderStatus_idx` ON `SalesOrders`(`specialOrderDeclaration`, `specialOrderStatus`);
