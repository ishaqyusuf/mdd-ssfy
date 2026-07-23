-- AlterTable
ALTER TABLE `StorefrontCheckout`
    ADD COLUMN `shippingQuoteId` VARCHAR(191) NULL;

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

    UNIQUE INDEX `StorefrontShippingQuote_collectionId_revision_key`(`collectionId`, `revision`),
    INDEX `StorefrontShippingQuote_collectionId_status_createdAt_idx`(`collectionId`, `status`, `createdAt`),
    INDEX `StorefrontShippingQuote_policyId_policyVersion_idx`(`policyId`, `policyVersion`),
    INDEX `StorefrontShippingQuote_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `StorefrontShippingQuote_destinationPlaceId_idx`(`destinationPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `StorefrontCheckout_shippingQuoteId_key`
    ON `StorefrontCheckout`(`shippingQuoteId`);
