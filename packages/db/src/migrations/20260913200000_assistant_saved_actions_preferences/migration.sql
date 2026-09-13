CREATE TABLE `AssistantPreference` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` INTEGER NOT NULL,
    `scopeType` VARCHAR(50) NOT NULL DEFAULT 'user',
    `scopeId` VARCHAR(191) NOT NULL,
    `responseStyle` VARCHAR(32) NOT NULL DEFAULT 'balanced',
    `responseDetail` VARCHAR(32) NOT NULL DEFAULT 'standard',
    `chartPresentation` VARCHAR(32) NOT NULL DEFAULT 'auto',
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `asst_pref_owner_scope_uq`(`ownerUserId`, `scopeType`, `scopeId`),
    INDEX `asst_pref_owner_idx`(`ownerUserId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AssistantPersonalMemory` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` INTEGER NOT NULL,
    `scopeType` VARCHAR(50) NOT NULL DEFAULT 'user',
    `scopeId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(500) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `asst_memory_scope_idx`(`ownerUserId`, `scopeType`, `scopeId`, `deletedAt`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AssistantSavedAction` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` INTEGER NOT NULL,
    `scopeType` VARCHAR(50) NOT NULL DEFAULT 'user',
    `scopeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `kind` VARCHAR(24) NOT NULL,
    `promptTemplate` TEXT NULL,
    `toolId` VARCHAR(191) NULL,
    `toolVersion` INTEGER NULL,
    `effect` VARCHAR(32) NULL,
    `inputTemplate` JSON NULL,
    `parameterDefinitions` JSON NULL,
    `outputBindings` JSON NULL,
    `compatibilityRevision` VARCHAR(191) NOT NULL,
    `activeKey` VARCHAR(191) NOT NULL DEFAULT 'active',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `lastRunStatus` VARCHAR(32) NULL,
    `lastRunAt` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `asst_saved_action_name_uq`(`ownerUserId`, `scopeType`, `scopeId`, `name`, `activeKey`),
    INDEX `asst_saved_action_scope_idx`(`ownerUserId`, `scopeType`, `scopeId`, `deletedAt`, `displayOrder`),
    INDEX `asst_saved_action_tool_idx`(`toolId`, `toolVersion`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
