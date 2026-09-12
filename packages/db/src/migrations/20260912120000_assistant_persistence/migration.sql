-- CreateTable
CREATE TABLE `AssistantConversation` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` INTEGER NOT NULL,
    `scopeType` VARCHAR(50) NOT NULL DEFAULT 'user',
    `scopeId` VARCHAR(191) NULL,
    `title` VARCHAR(500) NULL,
    `preferences` JSON NULL,
    `lastSequence` INTEGER NOT NULL DEFAULT 0,
    `retentionUntil` TIMESTAMP(0) NULL,
    `archivedAt` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asst_conv_owner_active_idx`(`ownerUserId`, `archivedAt`, `deletedAt`, `updatedAt`),
    INDEX `asst_conv_scope_idx`(`ownerUserId`, `scopeType`, `scopeId`, `deletedAt`),
    INDEX `asst_conv_retention_idx`(`retentionUntil`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `parts` JSON NOT NULL,
    `searchText` TEXT NULL,
    `clientRequestId` VARCHAR(191) NULL,
    `requestFingerprint` CHAR(64) NULL,
    `generatedRunId` VARCHAR(191) NULL,
    `parentMessageId` VARCHAR(191) NULL,
    `createdByUserId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `asst_msg_seq_uq`(`conversationId`, `sequence`),
    UNIQUE INDEX `asst_msg_request_uq`(`conversationId`, `clientRequestId`),
    UNIQUE INDEX `asst_msg_generated_run_uq`(`generatedRunId`),
    INDEX `asst_msg_created_idx`(`conversationId`, `createdAt`),
    INDEX `asst_msg_parent_idx`(`parentMessageId`),
    INDEX `asst_msg_actor_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantRun` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `triggerMessageId` VARCHAR(191) NULL,
    `actorUserId` INTEGER NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `requestFingerprint` CHAR(64) NOT NULL,
    `catalogVersion` VARCHAR(64) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `promptVersion` VARCHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'queued',
    `checkpoint` JSON NULL,
    `terminalResult` JSON NULL,
    `usage` JSON NULL,
    `lastSequence` INTEGER NOT NULL DEFAULT 0,
    `errorCode` VARCHAR(100) NULL,
    `errorMessage` TEXT NULL,
    `startedAt` TIMESTAMP(0) NULL,
    `completedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asst_run_request_uq`(`actorUserId`, `requestId`),
    INDEX `asst_run_status_idx`(`conversationId`, `status`, `createdAt`),
    INDEX `asst_run_updated_idx`(`conversationId`, `updatedAt`),
    INDEX `asst_run_trigger_idx`(`triggerMessageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantToolExecution` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `toolCallId` VARCHAR(191) NOT NULL,
    `step` INTEGER NOT NULL,
    `ordinal` INTEGER NOT NULL DEFAULT 0,
    `eventSequence` INTEGER NOT NULL,
    `toolId` VARCHAR(191) NOT NULL,
    `toolVersion` INTEGER NOT NULL,
    `effect` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'running',
    `inputFingerprint` CHAR(64) NOT NULL,
    `input` JSON NULL,
    `result` JSON NULL,
    `errorCode` VARCHAR(100) NULL,
    `durationMs` INTEGER NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `startedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `completedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asst_tool_call_uq`(`runId`, `toolCallId`),
    UNIQUE INDEX `asst_tool_step_uq`(`runId`, `step`, `ordinal`),
    UNIQUE INDEX `asst_tool_event_uq`(`runId`, `eventSequence`),
    INDEX `asst_tool_status_idx`(`runId`, `status`, `createdAt`),
    INDEX `asst_tool_version_idx`(`toolId`, `toolVersion`, `createdAt`),
    UNIQUE INDEX `asst_tool_idempotency_uq`(`idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssistantActionProposal` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `actorUserId` INTEGER NOT NULL,
    `toolId` VARCHAR(191) NOT NULL,
    `toolVersion` INTEGER NOT NULL,
    `effect` VARCHAR(32) NOT NULL,
    `payloadHash` CHAR(64) NOT NULL,
    `payload` JSON NOT NULL,
    `targetRevision` VARCHAR(191) NULL,
    `diff` JSON NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `expiresAt` TIMESTAMP(0) NOT NULL,
    `nonceHash` CHAR(64) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `eventSequence` INTEGER NOT NULL,
    `confirmedAt` TIMESTAMP(0) NULL,
    `consumedAt` TIMESTAMP(0) NULL,
    `rejectedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asst_proposal_nonce_uq`(`nonceHash`),
    UNIQUE INDEX `asst_proposal_idempotency_uq`(`actorUserId`, `idempotencyKey`),
    UNIQUE INDEX `asst_proposal_event_uq`(`runId`, `eventSequence`),
    INDEX `asst_proposal_run_idx`(`runId`, `status`, `createdAt`),
    INDEX `asst_proposal_actor_idx`(`actorUserId`, `status`, `expiresAt`),
    INDEX `asst_proposal_tool_idx`(`toolId`, `toolVersion`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
