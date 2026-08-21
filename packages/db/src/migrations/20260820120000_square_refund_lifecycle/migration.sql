CREATE TABLE `SquareTenderPayment` (
  `id` VARCHAR(191) NOT NULL,
  `providerPaymentId` VARCHAR(191) NOT NULL,
  `legacySquarePaymentId` VARCHAR(191) NULL,
  `checkoutId` VARCHAR(191) NULL,
  `providerOrderId` VARCHAR(191) NULL,
  `source` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `amountCents` INTEGER NOT NULL,
  `tipCents` INTEGER NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `locationId` VARCHAR(191) NULL,
  `paidAt` TIMESTAMP(0) NULL,
  `verifiedAt` TIMESTAMP(0) NULL,
  `verificationSource` VARCHAR(100) NULL,
  `meta` JSON NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SquareTenderPayment_providerPaymentId_key`(`providerPaymentId`),
  INDEX `SquareTenderPayment_legacySquarePaymentId_idx`(`legacySquarePaymentId`),
  INDEX `SquareTenderPayment_checkoutId_idx`(`checkoutId`),
  INDEX `SquareTenderPayment_providerOrderId_idx`(`providerOrderId`),
  INDEX `SquareTenderPayment_status_paidAt_idx`(`status`, `paidAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SalesSquareRefund` (
  `id` VARCHAR(191) NOT NULL,
  `tenderPaymentId` VARCHAR(191) NOT NULL,
  `origin` VARCHAR(30) NOT NULL DEFAULT 'gnd',
  `providerStatus` VARCHAR(50) NOT NULL DEFAULT 'not_submitted',
  `applicationStatus` VARCHAR(50) NOT NULL DEFAULT 'reserved',
  `providerRefundId` VARCHAR(191) NULL,
  `idempotencyKey` VARCHAR(45) NOT NULL,
  `amountCents` INTEGER NOT NULL,
  `principalCents` INTEGER NOT NULL,
  `cccCents` INTEGER NOT NULL DEFAULT 0,
  `tipCents` INTEGER NOT NULL DEFAULT 0,
  `reservedCents` INTEGER NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `reason` VARCHAR(192) NOT NULL,
  `note` TEXT NULL,
  `commercialActionType` VARCHAR(100) NULL,
  `commercialActionId` VARCHAR(191) NULL,
  `initiatedById` INTEGER NULL,
  `providerCreatedAt` TIMESTAMP(0) NULL,
  `completedAt` TIMESTAMP(0) NULL,
  `appliedAt` TIMESTAMP(0) NULL,
  `failureCode` VARCHAR(100) NULL,
  `failureDetail` TEXT NULL,
  `version` INTEGER NOT NULL DEFAULT 0,
  `meta` JSON NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SalesSquareRefund_providerRefundId_key`(`providerRefundId`),
  UNIQUE INDEX `SalesSquareRefund_idempotencyKey_key`(`idempotencyKey`),
  INDEX `SalesSquareRefund_tenderPaymentId_providerStatus_idx`(`tenderPaymentId`, `providerStatus`),
  INDEX `SalesSquareRefund_providerStatus_applicationStatus_updatedAt_idx`(`providerStatus`, `applicationStatus`, `updatedAt`),
  INDEX `SalesSquareRefund_origin_applicationStatus_idx`(`origin`, `applicationStatus`),
  INDEX `SalesSquareRefund_initiatedById_idx`(`initiatedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SalesSquareRefundAllocation` (
  `id` VARCHAR(191) NOT NULL,
  `refundId` VARCHAR(191) NOT NULL,
  `salesOrderId` INTEGER NOT NULL,
  `originalSalesPaymentId` INTEGER NULL,
  `appliedSalesPaymentId` INTEGER NULL,
  `principalCents` INTEGER NOT NULL,
  `cccCents` INTEGER NOT NULL DEFAULT 0,
  `tipCents` INTEGER NOT NULL DEFAULT 0,
  `meta` JSON NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SalesSquareRefundAllocation_refundId_salesOrderId_key`(`refundId`, `salesOrderId`),
  INDEX `SalesSquareRefundAllocation_salesOrderId_createdAt_idx`(`salesOrderId`, `createdAt`),
  INDEX `SalesSquareRefundAllocation_originalSalesPaymentId_idx`(`originalSalesPaymentId`),
  INDEX `SalesSquareRefundAllocation_appliedSalesPaymentId_idx`(`appliedSalesPaymentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SalesSquareRefundTransition` (
  `id` VARCHAR(191) NOT NULL,
  `refundId` VARCHAR(191) NOT NULL,
  `providerStatus` VARCHAR(50) NOT NULL,
  `applicationStatus` VARCHAR(50) NOT NULL,
  `source` VARCHAR(50) NOT NULL,
  `actorId` INTEGER NULL,
  `eventId` VARCHAR(191) NULL,
  `message` TEXT NULL,
  `snapshot` JSON NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `SalesSquareRefundTransition_refundId_createdAt_idx`(`refundId`, `createdAt`),
  INDEX `SalesSquareRefundTransition_eventId_idx`(`eventId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SquareRefundWebhookEvent` (
  `id` VARCHAR(191) NOT NULL,
  `providerEventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(100) NOT NULL,
  `providerRefundId` VARCHAR(191) NULL,
  `payload` JSON NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'received',
  `processedAt` TIMESTAMP(0) NULL,
  `failureDetail` TEXT NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SquareRefundWebhookEvent_providerEventId_key`(`providerEventId`),
  INDEX `SquareRefundWebhookEvent_providerRefundId_idx`(`providerRefundId`),
  INDEX `SquareRefundWebhookEvent_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SalesSquareRefund` ADD CONSTRAINT `SalesSquareRefund_tenderPaymentId_fkey` FOREIGN KEY (`tenderPaymentId`) REFERENCES `SquareTenderPayment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SalesSquareRefundAllocation` ADD CONSTRAINT `SalesSquareRefundAllocation_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `SalesSquareRefund`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SalesSquareRefundTransition` ADD CONSTRAINT `SalesSquareRefundTransition_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `SalesSquareRefund`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
