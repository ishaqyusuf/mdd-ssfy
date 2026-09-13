CREATE TABLE `AssistantUserEntitlement` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` TIMESTAMP(0) NULL,
    `reason` VARCHAR(500) NULL,
    `createdByUserId` INTEGER NOT NULL,
    `updatedByUserId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `asst_entitlement_user_uq`(`userId`),
    INDEX `asst_entitlement_state_idx`(`enabled`, `expiresAt`, `updatedAt`),
    INDEX `asst_entitlement_admin_idx`(`updatedByUserId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AssistantEntitlementEvent` (
    `id` VARCHAR(191) NOT NULL,
    `entitlementId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `type` VARCHAR(32) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `expiresAt` TIMESTAMP(0) NULL,
    `reason` VARCHAR(500) NULL,
    `actorUserId` INTEGER NULL,
    `entitlementVersion` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    UNIQUE INDEX `asst_entitlement_event_version_uq`(`entitlementId`, `entitlementVersion`),
    INDEX `asst_entitlement_event_user_idx`(`userId`, `createdAt`),
    INDEX `asst_entitlement_event_actor_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
