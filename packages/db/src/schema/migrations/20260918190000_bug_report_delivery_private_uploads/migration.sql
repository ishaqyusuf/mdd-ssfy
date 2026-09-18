-- Existing bug reports are intentionally not backfilled into the delivery queue.
-- Confirmed historical GitHub receipts require a separately reviewed import, while
-- incomplete/failed historical attempts must remain untouched to avoid duplicates.

-- AlterTable
ALTER TABLE `BugReport` ADD COLUMN `submissionFingerprint` VARCHAR(191) NULL,
    ADD COLUMN `submissionId` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `BugReportUploadIntent` (
    `id` VARCHAR(191) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `mediaKind` ENUM('VIDEO', 'SCREENSHOT', 'AUDIO') NOT NULL,
    `pathname` VARCHAR(512) NOT NULL,
    `expectedMimeType` VARCHAR(255) NOT NULL,
    `expectedSize` INTEGER NOT NULL,
    `verifiedMimeType` VARCHAR(255) NULL,
    `verifiedSize` INTEGER NULL,
    `verifiedStorageUrl` VARCHAR(512) NULL,
    `state` ENUM('PENDING', 'READY', 'CONSUMED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` TIMESTAMP(0) NOT NULL,
    `consumedReportId` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BugReportUploadIntent_pathname_key`(`pathname`),
    INDEX `BugReportUploadIntent_createdById_state_expiresAt_idx`(`createdById`, `state`, `expiresAt`),
    INDEX `BugReportUploadIntent_consumedReportId_idx`(`consumedReportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BugReportDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `repository` VARCHAR(191) NOT NULL,
    `actionKey` VARCHAR(191) NOT NULL,
    `state` ENUM('PENDING', 'PROCESSING', 'CREATED', 'RETRY_WAIT', 'FAILED', 'UNCONFIGURED', 'UNCERTAIN') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` TIMESTAMP(0) NULL,
    `leaseId` VARCHAR(191) NULL,
    `leaseExpiresAt` TIMESTAMP(0) NULL,
    `lastErrorCode` VARCHAR(100) NULL,
    `remoteIssueNumber` INTEGER NULL,
    `remoteIssueKey` VARCHAR(191) NULL,
    `remoteIssueUrl` VARCHAR(512) NULL,
    `scanCursor` VARCHAR(191) NULL,
    `scanCompletedAt` TIMESTAMP(0) NULL,
    `firstAttemptAt` TIMESTAMP(0) NULL,
    `lastAttemptAt` TIMESTAMP(0) NULL,
    `sentAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BugReportDelivery_reportId_key`(`reportId`),
    UNIQUE INDEX `BugReportDelivery_actionKey_key`(`actionKey`),
    INDEX `BugReportDelivery_state_nextAttemptAt_idx`(`state`, `nextAttemptAt`),
    INDEX `BugReportDelivery_provider_repository_idx`(`provider`, `repository`),
    INDEX `BugReportDelivery_leaseExpiresAt_idx`(`leaseExpiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `BugReport_createdById_submissionId_key` ON `BugReport`(`createdById`, `submissionId`);
