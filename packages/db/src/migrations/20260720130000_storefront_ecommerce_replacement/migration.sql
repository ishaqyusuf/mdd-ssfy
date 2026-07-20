-- Storefront is an overlay around the canonical Dyke and SalesOrders models.
-- No inventory, product, pricing, or order source of truth is duplicated here.

ALTER TABLE `SalesOrders`
    ADD COLUMN `salesChannel` VARCHAR(64) NULL,
    ADD INDEX `SalesOrders_salesChannel_createdAt_idx` (`salesChannel`, `createdAt`);

CREATE TABLE `StorefrontCategory` (
    `id` VARCHAR(191) NOT NULL,
    `rootStepUid` VARCHAR(191) NOT NULL,
    `rootComponentUid` VARCHAR(191) NOT NULL,
    `listingStepUid` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` TEXT NULL,
    `seo` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` TIMESTAMP(0) NULL,
    `createdByUserId` INTEGER NULL,
    `updatedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `StorefrontCategory_rootComponentUid_key` (`rootComponentUid`),
    UNIQUE INDEX `StorefrontCategory_slug_key` (`slug`),
    INDEX `StorefrontCategory_status_sortOrder_idx` (`status`, `sortOrder`),
    INDEX `StorefrontCategory_rootStepUid_idx` (`rootStepUid`),
    INDEX `StorefrontCategory_listingStepUid_idx` (`listingStepUid`),
    INDEX `StorefrontCategory_deletedAt_idx` (`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontOffer` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `sourceStepUid` VARCHAR(191) NOT NULL,
    `sourceComponentUid` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` TEXT NULL,
    `seo` JSON NULL,
    `availability` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `configurationVersion` INTEGER NOT NULL DEFAULT 1,
    `publishedAt` TIMESTAMP(0) NULL,
    `createdByUserId` INTEGER NULL,
    `updatedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `StorefrontOffer_sourceComponentUid_key` (`sourceComponentUid`),
    UNIQUE INDEX `StorefrontOffer_slug_key` (`slug`),
    UNIQUE INDEX `StorefrontOffer_categoryId_slug_key` (`categoryId`, `slug`),
    INDEX `StorefrontOffer_categoryId_status_sortOrder_idx` (`categoryId`, `status`, `sortOrder`),
    INDEX `StorefrontOffer_sourceStepUid_idx` (`sourceStepUid`),
    INDEX `StorefrontOffer_deletedAt_idx` (`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontComponent` (
    `id` VARCHAR(191) NOT NULL,
    `sourceStepUid` VARCHAR(191) NOT NULL,
    `sourceComponentUid` VARCHAR(191) NOT NULL,
    `availableOnStorefront` BOOLEAN NOT NULL DEFAULT false,
    `title` VARCHAR(255) NULL,
    `description` LONGTEXT NULL,
    `imageUrl` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdByUserId` INTEGER NULL,
    `updatedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `StorefrontComponent_sourceComponentUid_key` (`sourceComponentUid`),
    INDEX `StorefrontComponent_step_available_sort_idx` (`sourceStepUid`, `availableOnStorefront`, `sortOrder`),
    INDEX `StorefrontComponent_status_idx` (`status`),
    INDEX `StorefrontComponent_deletedAt_idx` (`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontStepPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `stepUid` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NULL,
    `helpText` LONGTEXT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `allowSkip` BOOLEAN NOT NULL DEFAULT false,
    `autoSelect` BOOLEAN NOT NULL DEFAULT false,
    `defaultComponentUid` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StorefrontStepPolicy_offerId_stepUid_key` (`offerId`, `stepUid`),
    INDEX `StorefrontStepPolicy_offerId_sortOrder_idx` (`offerId`, `sortOrder`),
    INDEX `StorefrontStepPolicy_stepUid_idx` (`stepUid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontOfferComponentPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `stepUid` VARCHAR(191) NOT NULL,
    `sourceComponentUid` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `defaultSelected` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StorefrontOfferComponentPolicy_offer_step_component_key` (`offerId`, `stepUid`, `sourceComponentUid`),
    INDEX `StorefrontOfferComponentPolicy_offer_step_enabled_sort_idx` (`offerId`, `stepUid`, `enabled`, `sortOrder`),
    INDEX `StorefrontOfferComponentPolicy_sourceComponentUid_idx` (`sourceComponentUid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontCommerceCollection` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CART', 'WISHLIST') NOT NULL,
    `status` ENUM('ACTIVE', 'CHECKOUT', 'COMPLETED', 'ABANDONED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `ownerUserId` INTEGER NULL,
    `guestTokenHash` VARCHAR(191) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `version` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` TIMESTAMP(0) NULL,
    `completedSalesOrderId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StorefrontCollection_owner_type_status_idx` (`ownerUserId`, `type`, `status`),
    INDEX `StorefrontCollection_guest_type_status_idx` (`guestTokenHash`, `type`, `status`),
    INDEX `StorefrontCollection_status_expiresAt_idx` (`status`, `expiresAt`),
    INDEX `StorefrontCollection_completedSalesOrderId_idx` (`completedSalesOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontCommerceLine` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NULL,
    `rootStepUid` VARCHAR(191) NOT NULL,
    `rootComponentUid` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `configuration` JSON NOT NULL,
    `configurationHash` VARCHAR(191) NOT NULL,
    `configurationVersion` INTEGER NOT NULL DEFAULT 1,
    `pricingSnapshot` JSON NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,
    `validationStatus` ENUM('PENDING', 'VALID', 'PRICE_CHANGED', 'UNAVAILABLE', 'INVALID') NOT NULL DEFAULT 'PENDING',
    `validationMessage` TEXT NULL,
    `lastValidatedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StorefrontCommerceLine_collectionId_createdAt_idx` (`collectionId`, `createdAt`),
    INDEX `StorefrontCommerceLine_offerId_idx` (`offerId`),
    INDEX `StorefrontCommerceLine_rootComponentUid_idx` (`rootComponentUid`),
    INDEX `StorefrontCommerceLine_configurationHash_idx` (`configurationHash`),
    INDEX `StorefrontCommerceLine_validationStatus_idx` (`validationStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontCheckout` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `ownerUserId` INTEGER NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'READY', 'PAYMENT_PENDING', 'PAID', 'ORDER_CREATED', 'FAILED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `acceptedConfiguration` JSON NULL,
    `totals` JSON NULL,
    `shippingAddress` JSON NULL,
    `billingAddress` JSON NULL,
    `paymentProvider` VARCHAR(64) NULL,
    `paymentReference` VARCHAR(191) NULL,
    `salesOrderId` INTEGER NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `expiresAt` TIMESTAMP(0) NULL,
    `paidAt` TIMESTAMP(0) NULL,
    `completedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StorefrontCheckout_idempotencyKey_key` (`idempotencyKey`),
    INDEX `StorefrontCheckout_collectionId_status_idx` (`collectionId`, `status`),
    INDEX `StorefrontCheckout_ownerUserId_createdAt_idx` (`ownerUserId`, `createdAt`),
    INDEX `StorefrontCheckout_salesOrderId_idx` (`salesOrderId`),
    INDEX `StorefrontCheckout_paymentReference_idx` (`paymentReference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontPage` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `seo` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` TIMESTAMP(0) NULL,
    `createdByUserId` INTEGER NULL,
    `updatedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `StorefrontPage_slug_key` (`slug`),
    INDEX `StorefrontPage_status_publishedAt_idx` (`status`, `publishedAt`),
    INDEX `StorefrontPage_deletedAt_idx` (`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontSection` (
    `id` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `content` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StorefrontSection_pageId_key_key` (`pageId`, `key`),
    INDEX `StorefrontSection_pageId_status_sortOrder_idx` (`pageId`, `status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontAuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` INTEGER NULL,
    `ownerUserId` INTEGER NULL,
    `guestHash` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `ipHash` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `StorefrontAuditEvent_actorUserId_createdAt_idx` (`actorUserId`, `createdAt`),
    INDEX `StorefrontAuditEvent_ownerUserId_createdAt_idx` (`ownerUserId`, `createdAt`),
    INDEX `StorefrontAuditEvent_guestHash_createdAt_idx` (`guestHash`, `createdAt`),
    INDEX `StorefrontAuditEvent_entityType_entityId_createdAt_idx` (`entityType`, `entityId`, `createdAt`),
    INDEX `StorefrontAuditEvent_action_createdAt_idx` (`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontInquiry` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CONTACT', 'CUSTOM_QUOTE') NOT NULL,
    `status` ENUM('NEW', 'IN_REVIEW', 'RESPONDED', 'CLOSED', 'SPAM') NOT NULL DEFAULT 'NEW',
    `ownerUserId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `phone` VARCHAR(64) NULL,
    `subject` VARCHAR(255) NULL,
    `message` LONGTEXT NOT NULL,
    `projectTypes` JSON NULL,
    `budget` VARCHAR(191) NULL,
    `assignedToId` INTEGER NULL,
    `requestId` VARCHAR(191) NULL,
    `ipHash` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `closedAt` TIMESTAMP(0) NULL,

    INDEX `StorefrontInquiry_status_createdAt_idx` (`status`, `createdAt`),
    INDEX `StorefrontInquiry_type_status_createdAt_idx` (`type`, `status`, `createdAt`),
    INDEX `StorefrontInquiry_ownerUserId_createdAt_idx` (`ownerUserId`, `createdAt`),
    INDEX `StorefrontInquiry_assignedToId_status_idx` (`assignedToId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorefrontPasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` TIMESTAMP(0) NOT NULL,
    `consumedAt` TIMESTAMP(0) NULL,
    `requestHash` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `StorefrontPasswordResetToken_tokenHash_key` (`tokenHash`),
    INDEX `StorefrontPasswordResetToken_userId_createdAt_idx` (`userId`, `createdAt`),
    INDEX `StorefrontPasswordResetToken_expiresAt_consumedAt_idx` (`expiresAt`, `consumedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StorefrontOffer`
    ADD CONSTRAINT `StorefrontOffer_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `StorefrontCategory` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `StorefrontStepPolicy`
    ADD CONSTRAINT `StorefrontStepPolicy_offerId_fkey`
    FOREIGN KEY (`offerId`) REFERENCES `StorefrontOffer` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `StorefrontOfferComponentPolicy`
    ADD CONSTRAINT `StorefrontOfferComponentPolicy_offerId_fkey`
    FOREIGN KEY (`offerId`) REFERENCES `StorefrontOffer` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `StorefrontCommerceLine`
    ADD CONSTRAINT `StorefrontCommerceLine_collectionId_fkey`
    FOREIGN KEY (`collectionId`) REFERENCES `StorefrontCommerceCollection` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `StorefrontCheckout`
    ADD CONSTRAINT `StorefrontCheckout_collectionId_fkey`
    FOREIGN KEY (`collectionId`) REFERENCES `StorefrontCommerceCollection` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `StorefrontSection`
    ADD CONSTRAINT `StorefrontSection_pageId_fkey`
    FOREIGN KEY (`pageId`) REFERENCES `StorefrontPage` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
