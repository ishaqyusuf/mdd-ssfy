CREATE TABLE `WebAuthUser` (
    `id` VARCHAR(191) NOT NULL,
    `legacyUserId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WebAuthUser_legacyUserId_key`(`legacyUserId`),
    UNIQUE INDEX `WebAuthUser_email_key`(`email`),
    INDEX `WebAuthUser_legacyUserId_idx`(`legacyUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WebAuthSession` (
    `id` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `WebAuthSession_token_key`(`token`),
    INDEX `WebAuthSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WebAuthAccount` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NULL,
    `refreshToken` VARCHAR(191) NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WebAuthAccount_providerId_accountId_key`(`providerId`, `accountId`),
    INDEX `WebAuthAccount_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WebAuthVerification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `WebAuthUser` (
    `id`,
    `legacyUserId`,
    `name`,
    `email`,
    `emailVerified`,
    `image`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    `id`,
    COALESCE(NULLIF(`name`, ''), `email`),
    LOWER(`email`),
    `emailVerifiedAt` IS NOT NULL,
    NULL,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Users`
WHERE
    `deletedAt` IS NULL
    AND `accessRevokedAt` IS NULL
    AND `password` IS NOT NULL
    AND `email` IS NOT NULL
    AND (`type` IS NULL OR `type` IN ('EMPLOYEE', 'MANAGER'))
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `email` = VALUES(`email`),
    `emailVerified` = VALUES(`emailVerified`),
    `updatedAt` = CURRENT_TIMESTAMP(3);
