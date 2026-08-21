-- DropForeignKey
ALTER TABLE `DispatchException` DROP FOREIGN KEY `DispatchException_orderDeliveryId_fkey`;

-- DropForeignKey
ALTER TABLE `SalesSquareRefund` DROP FOREIGN KEY `SalesSquareRefund_tenderPaymentId_fkey`;

-- DropForeignKey
ALTER TABLE `SalesSquareRefundAllocation` DROP FOREIGN KEY `SalesSquareRefundAllocation_refundId_fkey`;

-- DropForeignKey
ALTER TABLE `SalesSquareRefundTransition` DROP FOREIGN KEY `SalesSquareRefundTransition_refundId_fkey`;

-- DropForeignKey
ALTER TABLE `StockAllocation` DROP FOREIGN KEY `StockAllocation_orderDeliveryId_fkey`;

-- DropForeignKey
ALTER TABLE `StorefrontCheckout` DROP FOREIGN KEY `StorefrontCheckout_collectionId_fkey`;

-- DropForeignKey
ALTER TABLE `StorefrontCommerceLine` DROP FOREIGN KEY `StorefrontCommerceLine_collectionId_fkey`;

-- DropForeignKey
ALTER TABLE `StorefrontOffer` DROP FOREIGN KEY `StorefrontOffer_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `StorefrontOfferComponentPolicy` DROP FOREIGN KEY `StorefrontOfferComponentPolicy_offerId_fkey`;

-- DropForeignKey
ALTER TABLE `StorefrontSection` DROP FOREIGN KEY `StorefrontSection_pageId_fkey`;

-- DropForeignKey
ALTER TABLE `StorefrontStepPolicy` DROP FOREIGN KEY `StorefrontStepPolicy_offerId_fkey`;

-- AlterTable
ALTER TABLE `Customers` ADD COLUMN `officeVisibility` ENUM('PRIVATE', 'SHARED') NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE `DealerSales` ADD COLUMN `dealerCustomerTax` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `dealerMarkupAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `dealerSubtotal` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `dealerTaxableSubtotal` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `internalSubtotal` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `internalTax` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `internalTaxableSubtotal` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `resaleCertificateOnFile` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `selectedTaxModelId` VARCHAR(255) NULL,
    ADD COLUMN `selectedTaxModelName` VARCHAR(255) NULL,
    ADD COLUMN `selectedTaxModelSnapshot` JSON NULL,
    ADD COLUMN `sellerOfRecord` ENUM('DEALER', 'GND') NOT NULL DEFAULT 'DEALER';

-- AlterTable
ALTER TABLE `LinePricing` MODIFY `costPrice` DOUBLE NULL,
    MODIFY `salesPrice` DOUBLE NULL,
    MODIFY `unitCostPrice` DOUBLE NULL,
    MODIFY `unitSalesPrice` DOUBLE NULL;

-- AlterTable
ALTER TABLE `MasterPasswordLoginAudit` ADD COLUMN `countryCode` VARCHAR(2) NULL;

-- AlterTable
ALTER TABLE `SalesPayments` ADD COLUMN `origin` VARCHAR(191) NULL,
    ADD COLUMN `reviewMethod` VARCHAR(191) NULL,
    ADD COLUMN `reviewNote` TEXT NULL,
    ADD COLUMN `reviewStatus` VARCHAR(191) NULL,
    ADD COLUMN `reviewedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `reviewedByAction` VARCHAR(191) NULL,
    ADD COLUMN `reviewedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `StorefrontCheckout` ADD COLUMN `shippingQuoteId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `StorefrontInquiry` ADD COLUMN `authorizedUploadCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `customerId` INTEGER NULL,
    ADD COLUMN `lastActivityAt` TIMESTAMP(0) NULL,
    ADD COLUMN `projectBrief` JSON NULL,
    ADD COLUMN `quoteConversionById` INTEGER NULL,
    ADD COLUMN `quoteConversionStartedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `reference` VARCHAR(32) NULL,
    ADD COLUMN `salesQuoteId` INTEGER NULL,
    ADD COLUMN `submittedAt` TIMESTAMP(0) NULL,
    MODIFY `status` ENUM('DRAFT', 'NEW', 'IN_REVIEW', 'AWAITING_CUSTOMER', 'QUOTE_CREATED', 'RESPONDED', 'CLOSED', 'SPAM') NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE `StorefrontOffer` ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `featuredOrder` INTEGER NULL;

-- CreateTable
CREATE TABLE `BugReport` (
    `id` VARCHAR(191) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `status` ENUM('NEW', 'IN_REVIEW', 'IN_PROGRESS', 'NEEDS_INFO', 'FIXED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    `captureType` ENUM('VIDEO', 'SCREENSHOT') NOT NULL DEFAULT 'VIDEO',
    `description` TEXT NULL,
    `currentUrl` VARCHAR(2048) NULL,
    `userAgent` TEXT NULL,
    `source` VARCHAR(50) NOT NULL DEFAULT 'web',
    `recordingDocumentId` VARCHAR(191) NULL,
    `durationMs` INTEGER NULL,
    `microphoneEnabled` BOOLEAN NOT NULL DEFAULT false,
    `externalIssueProvider` VARCHAR(50) NULL,
    `externalIssueKey` VARCHAR(191) NULL,
    `externalIssueUrl` VARCHAR(512) NULL,
    `externalIssueStatus` VARCHAR(50) NULL,
    `externalIssueError` TEXT NULL,
    `externalIssueCreatedAt` TIMESTAMP(0) NULL,
    `statusUpdatedById` INTEGER NULL,
    `statusUpdatedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `BugReport_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `BugReport_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `BugReport_recordingDocumentId_idx`(`recordingDocumentId`),
    INDEX `BugReport_externalIssueProvider_externalIssueKey_idx`(`externalIssueProvider`, `externalIssueKey`),
    INDEX `BugReport_externalIssueStatus_createdAt_idx`(`externalIssueStatus`, `createdAt`),
    INDEX `BugReport_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BugReportFollowUp` (
    `id` VARCHAR(191) NOT NULL,
    `bugReportId` VARCHAR(191) NOT NULL,
    `authorId` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `audioDocumentId` VARCHAR(191) NULL,
    `audioDurationMs` INTEGER NULL,
    `transcriptionStatus` ENUM('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'NOT_REQUESTED',
    `transcriptionText` TEXT NULL,
    `transcriptionProvider` VARCHAR(100) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `BugReportFollowUp_bugReportId_createdAt_idx`(`bugReportId`, `createdAt`),
    INDEX `BugReportFollowUp_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `BugReportFollowUp_audioDocumentId_idx`(`audioDocumentId`),
    INDEX `BugReportFollowUp_transcriptionStatus_createdAt_idx`(`transcriptionStatus`, `createdAt`),
    INDEX `BugReportFollowUp_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerRecruitmentCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `audienceMode` ENUM('ALL_ELIGIBLE', 'SELECTED') NOT NULL DEFAULT 'ALL_ELIGIBLE',
    `headline` VARCHAR(255) NOT NULL,
    `benefitText` TEXT NOT NULL,
    `ctaLabel` VARCHAR(100) NOT NULL,
    `imageUrl` VARCHAR(1000) NULL,
    `accentColor` VARCHAR(20) NOT NULL DEFAULT '#0f766e',
    `placement` ENUM('TOP', 'BOTTOM') NOT NULL DEFAULT 'BOTTOM',
    `startsAt` TIMESTAMP(0) NULL,
    `endsAt` TIMESTAMP(0) NULL,
    `activatedAt` TIMESTAMP(0) NULL,
    `createdById` INTEGER NOT NULL,
    `updatedById` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    INDEX `DealerRecruitmentCampaign_status_startsAt_endsAt_idx`(`status`, `startsAt`, `endsAt`),
    INDEX `DealerRecruitmentCampaign_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `DealerRecruitmentCampaign_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerRecruitmentCampaignProfile` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `customerProfileId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `DealerRecruitmentCampaignProfile_customerProfileId_idx`(`customerProfileId`),
    UNIQUE INDEX `DealerRecruitmentCampaignProfile_campaignId_customerProfileI_key`(`campaignId`, `customerProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerRecruitmentCampaignCustomer` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `customerId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `DealerRecruitmentCampaignCustomer_customerId_idx`(`customerId`),
    UNIQUE INDEX `DealerRecruitmentCampaignCustomer_campaignId_customerId_key`(`campaignId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerProgramApplication` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `customerId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'DENIED') NOT NULL DEFAULT 'PENDING',
    `consentAt` TIMESTAMP(0) NOT NULL,
    `submittedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewedAt` TIMESTAMP(0) NULL,
    `reviewedById` INTEGER NULL,
    `decisionNote` TEXT NULL,
    `dealerAuthId` INTEGER NULL,
    `suppressionResetAt` TIMESTAMP(0) NULL,
    `suppressionResetById` INTEGER NULL,
    `suppressionResetReason` TEXT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DealerProgramApplication_invitationId_key`(`invitationId`),
    INDEX `DealerProgramApplication_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `DealerProgramApplication_customerId_submittedAt_idx`(`customerId`, `submittedAt`),
    INDEX `DealerProgramApplication_campaignId_status_idx`(`campaignId`, `status`),
    INDEX `DealerProgramApplication_dealerAuthId_idx`(`dealerAuthId`),
    INDEX `DealerProgramApplication_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesEmailAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'QUEUED',
    `emailKind` VARCHAR(80) NOT NULL,
    `documentType` VARCHAR(50) NULL,
    `emailType` VARCHAR(100) NULL,
    `subject` VARCHAR(500) NULL,
    `message` TEXT NULL,
    `recipientEmail` VARCHAR(255) NULL,
    `customerName` VARCHAR(255) NULL,
    `customerEmail` VARCHAR(255) NULL,
    `senderId` INTEGER NULL,
    `salesRepId` INTEGER NULL,
    `provider` VARCHAR(50) NULL,
    `providerMessageId` VARCHAR(255) NULL,
    `providerStatus` VARCHAR(100) NULL,
    `taskRunId` VARCHAR(255) NULL,
    `errorCode` VARCHAR(255) NULL,
    `errorMessage` TEXT NULL,
    `salesIds` JSON NULL,
    `salesNos` JSON NULL,
    `salesIdsText` VARCHAR(1000) NULL,
    `salesNosText` VARCHAR(1000) NULL,
    `metadata` JSON NULL,
    `originalAttemptId` VARCHAR(191) NULL,
    `sentAt` TIMESTAMP(0) NULL,
    `failedAt` TIMESTAMP(0) NULL,
    `skippedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `SalesEmailAttempt_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `SalesEmailAttempt_senderId_createdAt_idx`(`senderId`, `createdAt`),
    INDEX `SalesEmailAttempt_salesRepId_createdAt_idx`(`salesRepId`, `createdAt`),
    INDEX `SalesEmailAttempt_recipientEmail_idx`(`recipientEmail`),
    INDEX `SalesEmailAttempt_originalAttemptId_idx`(`originalAttemptId`),
    INDEX `SalesEmailAttempt_taskRunId_idx`(`taskRunId`),
    INDEX `SalesEmailAttempt_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `SalesOrderListProjection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NOT NULL,
    `orgId` INTEGER NULL,
    `salesRepId` INTEGER NULL,
    `customerId` INTEGER NULL,
    `orderId` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NULL,
    `status` VARCHAR(255) NULL,
    `prodStatus` VARCHAR(255) NULL,
    `amountDue` DOUBLE NULL,
    `invoiceTotal` DOUBLE NULL,
    `salesCreatedAt` TIMESTAMP(0) NULL,
    `salesDeletedAt` TIMESTAMP(0) NULL,
    `sourceUpdatedAt` DATETIME(3) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `state` VARCHAR(32) NOT NULL DEFAULT 'ready',
    `payload` JSON NOT NULL,
    `lastError` TEXT NULL,
    `projectedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesOrderListProjection_salesOrderId_key`(`salesOrderId`),
    INDEX `idx_sales_order_list_scope`(`orgId`, `salesDeletedAt`, `salesCreatedAt`, `salesOrderId`),
    INDEX `idx_sales_order_list_rep`(`salesRepId`, `salesDeletedAt`, `salesCreatedAt`, `salesOrderId`),
    INDEX `idx_sales_order_list_health`(`state`, `version`, `projectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesProductionReadinessOverride` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    `revision` VARCHAR(64) NOT NULL,
    `snapshot` JSON NOT NULL,
    `confirmedByUserId` INTEGER NOT NULL,
    `confirmedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `revokedByUserId` INTEGER NULL,
    `revokedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SalesProductionReadinessOverride_id_key`(`id`),
    UNIQUE INDEX `SalesProductionReadinessOverride_salesOrderId_key`(`salesOrderId`),
    INDEX `SalesProductionReadinessOverride_status_idx`(`status`),
    INDEX `SalesProductionReadinessOverride_confirmedByUserId_idx`(`confirmedByUserId`),
    INDEX `SalesProductionReadinessOverride_revokedByUserId_idx`(`revokedByUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontPromotion` (
    `id` VARCHAR(191) NOT NULL,
    `internalName` VARCHAR(255) NOT NULL,
    `publicTitle` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `badgeText` VARCHAR(64) NOT NULL,
    `bannerText` VARCHAR(255) NULL,
    `bannerHref` VARCHAR(191) NULL,
    `percentageOff` DECIMAL(5, 2) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `audienceMode` ENUM('EVERYONE', 'TARGETED') NOT NULL,
    `scopeMode` ENUM('ALL_OFFERS', 'TARGETED') NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `startsAt` TIMESTAMP(0) NOT NULL,
    `endsAt` TIMESTAMP(0) NULL,
    `publishedAt` TIMESTAMP(0) NULL,
    `createdByUserId` INTEGER NULL,
    `updatedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `StorefrontPromotion_status_startsAt_endsAt_idx`(`status`, `startsAt`, `endsAt`),
    INDEX `StorefrontPromotion_priority_idx`(`priority`),
    INDEX `StorefrontPromotion_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontPromotionCategory` (
    `promotionId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `StorefrontPromotionCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`promotionId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontPromotionOffer` (
    `promotionId` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `StorefrontPromotionOffer_offerId_idx`(`offerId`),
    PRIMARY KEY (`promotionId`, `offerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontPromotionCustomer` (
    `promotionId` VARCHAR(191) NOT NULL,
    `customerId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `StorefrontPromotionCustomer_customerId_idx`(`customerId`),
    PRIMARY KEY (`promotionId`, `customerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontPromotionCustomerProfile` (
    `promotionId` VARCHAR(191) NOT NULL,
    `customerProfileId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `StorefrontPromotionCustomerProfile_customerProfileId_idx`(`customerProfileId`),
    PRIMARY KEY (`promotionId`, `customerProfileId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontShippingPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `approvalMode` ENUM('OFFICE_REVIEW', 'AUTO_WHEN_CONFIDENT') NOT NULL DEFAULT 'OFFICE_REVIEW',
    `originPlaceId` VARCHAR(191) NULL,
    `originFormattedAddress` TEXT NULL,
    `baseDispatchFee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseVehicleRatePerMile` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `roundTripMultiplier` DECIMAL(8, 4) NOT NULL DEFAULT 2,
    `includedWeightLb` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `weightUnitLb` DECIMAL(12, 3) NOT NULL DEFAULT 100,
    `weightDistanceRate` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `packagingMultiplier` DECIMAL(8, 4) NOT NULL DEFAULT 1,
    `weightRoundingIncrementLb` DECIMAL(12, 3) NOT NULL DEFAULT 1,
    `minimumCharge` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `maximumCharge` DECIMAL(12, 2) NULL,
    `maxDistanceMiles` DECIMAL(12, 3) NULL,
    `maxWeightLb` DECIMAL(12, 3) NULL,
    `freeDeliveryThreshold` DECIMAL(12, 2) NULL,
    `autoApprovalMaxDistanceMiles` DECIMAL(12, 3) NULL,
    `autoApprovalMaxWeightLb` DECIMAL(12, 3) NULL,
    `autoApprovalMaxAmount` DECIMAL(12, 2) NULL,
    `allowGlobalFallbackForAutoApproval` BOOLEAN NOT NULL DEFAULT false,
    `globalDoorWeightLb` DECIMAL(12, 3) NULL,
    `globalMouldingLbPerLinearFoot` DECIMAL(12, 4) NULL,
    `globalShelfWeightPerUnitLb` DECIMAL(12, 3) NULL,
    `doorWeightProfiles` JSON NULL,
    `mouldingWeightProfiles` JSON NULL,
    `shelfCategoryWeights` JSON NULL,
    `productWeightOverrides` JSON NULL,
    `createdByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StorefrontShippingPolicy_version_key`(`version`),
    INDEX `StorefrontShippingPolicy_active_version_idx`(`active`, `version`),
    INDEX `StorefrontShippingPolicy_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontShippingQuote` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `policyId` VARCHAR(191) NOT NULL,
    `policyVersion` INTEGER NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('PENDING_OFFICE_REVIEW', 'MANUAL_REVIEW_REQUIRED', 'AUTO_APPROVED', 'APPROVED', 'OVERRIDDEN', 'SUPERSEDED', 'EXPIRED') NOT NULL,
    `cartVersion` INTEGER NOT NULL,
    `destinationPlaceId` VARCHAR(191) NULL,
    `destinationAddress` JSON NOT NULL,
    `oneWayDistanceMiles` DECIMAL(12, 3) NULL,
    `routeProvider` VARCHAR(64) NULL,
    `routeProviderReference` VARCHAR(191) NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `estimatedWeightLb` DECIMAL(12, 3) NOT NULL,
    `chargeableWeightLb` DECIMAL(12, 3) NOT NULL,
    `calculatedAmount` DECIMAL(12, 2) NOT NULL,
    `finalAmount` DECIMAL(12, 2) NULL,
    `calculation` JSON NOT NULL,
    `blockers` JSON NULL,
    `autoApprovalBlockers` JSON NULL,
    `reviewNote` TEXT NULL,
    `reviewedByUserId` INTEGER NULL,
    `reviewedAt` TIMESTAMP(0) NULL,
    `expiresAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StorefrontShippingQuote_collectionId_status_createdAt_idx`(`collectionId`, `status`, `createdAt`),
    INDEX `StorefrontShippingQuote_policyId_policyVersion_idx`(`policyId`, `policyVersion`),
    INDEX `StorefrontShippingQuote_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `StorefrontShippingQuote_destinationPlaceId_idx`(`destinationPlaceId`),
    UNIQUE INDEX `StorefrontShippingQuote_collectionId_revision_key`(`collectionId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorefrontInquiryActivity` (
    `id` VARCHAR(191) NOT NULL,
    `inquiryId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `actorUserId` INTEGER NULL,
    `body` LONGTEXT NULL,
    `metadata` JSON NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `StorefrontInquiryActivity_inquiryId_createdAt_idx`(`inquiryId`, `createdAt`),
    INDEX `StorefrontInquiryActivity_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    INDEX `StorefrontInquiryActivity_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskRunDiagnostic` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(255) NULL,
    `status` ENUM('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'STALE', 'START_FAILED') NOT NULL DEFAULT 'RUNNING',
    `taskName` VARCHAR(255) NOT NULL,
    `taskFamily` VARCHAR(120) NULL,
    `title` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `source` VARCHAR(120) NULL,
    `environment` VARCHAR(80) NULL,
    `actorId` INTEGER NULL,
    `actorName` VARCHAR(255) NULL,
    `actorEmail` VARCHAR(255) NULL,
    `entityType` VARCHAR(120) NULL,
    `entityId` VARCHAR(255) NULL,
    `entityLabel` VARCHAR(500) NULL,
    `userMessage` TEXT NULL,
    `internalError` TEXT NULL,
    `errorName` VARCHAR(255) NULL,
    `outputSummary` JSON NULL,
    `metadata` JSON NULL,
    `startedAt` TIMESTAMP(0) NULL,
    `finishedAt` TIMESTAMP(0) NULL,
    `lastSyncedAt` TIMESTAMP(0) NULL,
    `reviewedAt` TIMESTAMP(0) NULL,
    `reviewedById` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `TaskRunDiagnostic_runId_key`(`runId`),
    INDEX `TaskRunDiagnostic_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `TaskRunDiagnostic_taskName_createdAt_idx`(`taskName`, `createdAt`),
    INDEX `TaskRunDiagnostic_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `TaskRunDiagnostic_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `TaskRunDiagnostic_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Customers_dealerOwnerId_officeVisibility_idx` ON `Customers`(`dealerOwnerId`, `officeVisibility`);

-- CreateIndex
CREATE UNIQUE INDEX `DealerAuthAccount_providerId_accountId_key` ON `DealerAuthAccount`(`providerId`, `accountId`);

-- CreateIndex
CREATE INDEX `SalesPayments_orderId_reviewStatus_createdAt_idx` ON `SalesPayments`(`orderId`, `reviewStatus`, `createdAt`);

-- CreateIndex
CREATE INDEX `SalesPayments_reviewStatus_createdAt_idx` ON `SalesPayments`(`reviewStatus`, `createdAt`);

-- CreateIndex
CREATE UNIQUE INDEX `StorefrontCheckout_shippingQuoteId_key` ON `StorefrontCheckout`(`shippingQuoteId`);

-- CreateIndex
CREATE UNIQUE INDEX `StorefrontInquiry_reference_key` ON `StorefrontInquiry`(`reference`);

-- CreateIndex
CREATE UNIQUE INDEX `StorefrontInquiry_salesQuoteId_key` ON `StorefrontInquiry`(`salesQuoteId`);

-- CreateIndex
CREATE INDEX `StorefrontInquiry_customerId_createdAt_idx` ON `StorefrontInquiry`(`customerId`, `createdAt`);

-- CreateIndex
CREATE INDEX `StorefrontInquiry_lastActivityAt_idx` ON `StorefrontInquiry`(`lastActivityAt`);

-- CreateIndex
CREATE INDEX `StorefrontOffer_status_featured_featuredOrder_idx` ON `StorefrontOffer`(`status`, `featured`, `featuredOrder`);

-- RenameIndex
ALTER TABLE `StorefrontCommerceCollection` RENAME INDEX `StorefrontCollection_completedSalesOrderId_idx` TO `StorefrontCommerceCollection_completedSalesOrderId_idx`;

-- RenameIndex
ALTER TABLE `StorefrontCommerceCollection` RENAME INDEX `StorefrontCollection_guest_type_status_idx` TO `StorefrontCommerceCollection_guestTokenHash_type_status_idx`;

-- RenameIndex
ALTER TABLE `StorefrontCommerceCollection` RENAME INDEX `StorefrontCollection_owner_type_status_idx` TO `StorefrontCommerceCollection_ownerUserId_type_status_idx`;

-- RenameIndex
ALTER TABLE `StorefrontCommerceCollection` RENAME INDEX `StorefrontCollection_status_expiresAt_idx` TO `StorefrontCommerceCollection_status_expiresAt_idx`;

-- RenameIndex
ALTER TABLE `StorefrontOfferComponentPolicy` RENAME INDEX `StorefrontOfferComponentPolicy_offer_step_component_key` TO `StorefrontOfferComponentPolicy_offerId_stepUid_sourceCompone_key`;

-- RenameIndex
ALTER TABLE `StorefrontOfferComponentPolicy` RENAME INDEX `StorefrontOfferComponentPolicy_offer_step_enabled_sort_idx` TO `StorefrontOfferComponentPolicy_offerId_stepUid_enabled_sortO_idx`;
