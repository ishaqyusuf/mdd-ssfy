CREATE TABLE `PublicLinkToken` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(100) NOT NULL,
    `resourceType` VARCHAR(100) NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(0) NULL,
    `revokedAt` DATETIME(0) NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(0) NULL,

    UNIQUE INDEX `PublicLinkToken_token_key`(`token`),
    INDEX `PublicLinkToken_resourceType_resourceId_idx`(`resourceType`, `resourceId`),
    INDEX `PublicLinkToken_kind_expiresAt_idx`(`kind`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
