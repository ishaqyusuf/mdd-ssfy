-- CreateTable
CREATE TABLE `AssistantFeatureRequest` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` INTEGER NOT NULL,
    `scopeType` VARCHAR(50) NOT NULL,
    `scopeId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NULL,
    `canonicalKey` CHAR(64) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `capabilityKey` VARCHAR(191) NULL,
    `classifierVersion` VARCHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'submitted',
    `occurrenceCount` INTEGER NOT NULL DEFAULT 1,
    `lastEventSequence` INTEGER NOT NULL DEFAULT 0,
    `analysisStatus` VARCHAR(32) NOT NULL DEFAULT 'queued',
    `analysis` JSON NULL,
    `analysisRevision` VARCHAR(64) NULL,
    `knowledgeSnapshot` JSON NOT NULL,
    `assignedToUserId` INTEGER NULL,
    `mergedIntoId` VARCHAR(191) NULL,
    `releaseId` VARCHAR(191) NULL,
    `reviewedAnalysisAt` TIMESTAMP(0) NULL,
    `reviewedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asst_feature_request_scope_status_idx`(`scopeType`, `scopeId`, `status`, `updatedAt`),
    INDEX `asst_feature_request_analysis_idx`(`analysisStatus`, `updatedAt`),
    INDEX `asst_feature_request_owner_idx`(`assignedToUserId`, `status`, `updatedAt`),
    INDEX `asst_feature_request_conversation_idx`(`conversationId`, `createdAt`),
    INDEX `asst_feature_request_merge_idx`(`mergedIntoId`),
    INDEX `asst_feature_request_release_idx`(`releaseId`),
    UNIQUE INDEX `asst_feature_request_scope_key_uq`(`scopeType`, `scopeId`, `canonicalKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantFeatureRequestSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `reporterUserId` INTEGER NOT NULL,
    `scopeType` VARCHAR(50) NOT NULL,
    `scopeId` VARCHAR(191) NOT NULL,
    `clientRequestId` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `evidence` JSON NOT NULL,
    `consentVersion` VARCHAR(64) NOT NULL,
    `releaseOptIn` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `asst_feature_submission_reporter_idx`(`reporterUserId`, `scopeType`, `scopeId`, `createdAt`),
    INDEX `asst_feature_submission_feature_idx`(`requestId`, `createdAt`),
    UNIQUE INDEX `asst_feature_submission_request_uq`(`reporterUserId`, `scopeType`, `scopeId`, `clientRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Notifications`
    ADD COLUMN `assistantDeliveryKey` CHAR(64) NULL,
    ADD UNIQUE INDEX `notifications_assistant_delivery_uq`(`assistantDeliveryKey`);

-- CreateTable
CREATE TABLE `AssistantFeatureSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `scopeType` VARCHAR(50) NOT NULL,
    `scopeId` VARCHAR(191) NOT NULL,
    `consentVersion` VARCHAR(64) NOT NULL,
    `consentEvidence` JSON NOT NULL,
    `activeKey` VARCHAR(191) NOT NULL DEFAULT 'active',
    `unsubscribedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asst_feature_subscription_user_idx`(`userId`, `scopeType`, `scopeId`, `unsubscribedAt`),
    UNIQUE INDEX `asst_feature_subscription_active_uq`(`requestId`, `userId`, `scopeType`, `scopeId`, `activeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantFeatureRequestEvent` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `actorUserId` INTEGER NULL,
    `payload` JSON NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `asst_feature_event_request_idx`(`requestId`, `createdAt`),
    UNIQUE INDEX `asst_feature_event_sequence_uq`(`requestId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantFeatureAnalysisJob` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(32) NOT NULL DEFAULT 'queued',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `claimedAt` TIMESTAMP(0) NULL,
    `completedAt` TIMESTAMP(0) NULL,
    `lastErrorCode` VARCHAR(100) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asst_feature_analysis_queue_idx`(`status`, `createdAt`),
    UNIQUE INDEX `asst_feature_analysis_revision_uq`(`requestId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantCapabilityRelease` (
    `id` VARCHAR(191) NOT NULL,
    `capabilityKey` VARCHAR(191) NOT NULL,
    `version` VARCHAR(64) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
    `requiredGrants` JSON NOT NULL,
    `rolloutEvidence` JSON NULL,
    `verifiedAt` TIMESTAMP(0) NULL,
    `verifiedByUserId` INTEGER NULL,
    `publishedAt` TIMESTAMP(0) NULL,
    `publishedByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asst_capability_release_status_idx`(`status`, `verifiedAt`, `publishedAt`),
    UNIQUE INDEX `asst_capability_release_version_uq`(`capabilityKey`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantFeatureNotificationOutbox` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `releaseId` VARCHAR(191) NULL,
    `kind` VARCHAR(40) NOT NULL,
    `dedupeKey` CHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `availableAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deliveredAt` TIMESTAMP(0) NULL,
    `lastErrorCode` VARCHAR(100) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asst_feature_notice_dedupe_uq`(`dedupeKey`),
    INDEX `asst_feature_notice_queue_idx`(`status`, `availableAt`),
    INDEX `asst_feature_notice_request_idx`(`requestId`, `kind`, `createdAt`),
    INDEX `asst_feature_notice_subscription_idx`(`subscriptionId`),
    INDEX `asst_feature_notice_release_idx`(`releaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
