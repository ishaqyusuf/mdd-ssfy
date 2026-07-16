CREATE TABLE `MasterPasswordLoginAudit` (
    `id` VARCHAR(191) NOT NULL,
    `targetUserId` INTEGER NULL,
    `targetUserName` VARCHAR(255) NULL,
    `targetUserEmail` VARCHAR(255) NULL,
    `appSurface` VARCHAR(40) NOT NULL DEFAULT 'www',
    `platform` ENUM('WEBSITE', 'MOBILE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `ipAddress` VARCHAR(255) NULL,
    `browser` VARCHAR(255) NULL,
    `userAgent` TEXT NULL,
    `sessionId` VARCHAR(255) NULL,
    `loginAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `clearedAt` TIMESTAMP(0) NULL,
    `clearedBySuperAdminId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `MasterPasswordLoginAudit_clearedAt_loginAt_idx`
    ON `MasterPasswordLoginAudit`(`clearedAt`, `loginAt`);

CREATE INDEX `MasterPasswordLoginAudit_targetUserId_loginAt_idx`
    ON `MasterPasswordLoginAudit`(`targetUserId`, `loginAt`);

CREATE INDEX `MasterPasswordLoginAudit_platform_loginAt_idx`
    ON `MasterPasswordLoginAudit`(`platform`, `loginAt`);

CREATE INDEX `MasterPasswordLoginAudit_sessionId_idx`
    ON `MasterPasswordLoginAudit`(`sessionId`);

CREATE INDEX `MasterPasswordLoginAudit_deletedAt_idx`
    ON `MasterPasswordLoginAudit`(`deletedAt`);
