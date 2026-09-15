-- CreateTable
CREATE TABLE `AssistantDiagnostic` (
    `reference` VARCHAR(32) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `conversationId` VARCHAR(191) NULL,
    `runId` VARCHAR(191) NULL,
    `toolCallId` VARCHAR(191) NULL,
    `actorUserId` INTEGER NULL,
    `scopeType` VARCHAR(32) NULL,
    `scopeId` VARCHAR(191) NULL,
    `stage` VARCHAR(32) NOT NULL,
    `operation` VARCHAR(120) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `severity` VARCHAR(16) NOT NULL,
    `outcome` VARCHAR(32) NOT NULL,
    `publicMessage` VARCHAR(500) NOT NULL,
    `environment` VARCHAR(32) NOT NULL,
    `release` VARCHAR(64) NULL,
    `provider` VARCHAR(32) NULL,
    `model` VARCHAR(100) NULL,
    `durationMs` INTEGER NULL,
    `details` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'new',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `AssistantDiagnostic_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `AssistantDiagnostic_fingerprint_createdAt_idx`(`fingerprint`, `createdAt`),
    INDEX `AssistantDiagnostic_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    INDEX `AssistantDiagnostic_runId_createdAt_idx`(`runId`, `createdAt`),
    INDEX `AssistantDiagnostic_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`reference`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantDiagnosticReview` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `reviewerId` INTEGER NOT NULL,
    `fromStatus` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `note` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AssistantDiagnosticReview_reference_createdAt_idx`(`reference`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
