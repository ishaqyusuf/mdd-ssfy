CREATE TABLE `ShortLink` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `targetUrl` VARCHAR(2048) NOT NULL,
    `title` VARCHAR(255) NULL,
    `sourceType` VARCHAR(100) NULL,
    `sourceId` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` TIMESTAMP(0) NULL,
    `clickCount` INTEGER NOT NULL DEFAULT 0,
    `lastClickedAt` TIMESTAMP(0) NULL,
    `createdById` INTEGER NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ShortLink_slug_key`(`slug`),
    INDEX `ShortLink_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `ShortLink_active_expiresAt_idx`(`active`, `expiresAt`),
    INDEX `ShortLink_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
