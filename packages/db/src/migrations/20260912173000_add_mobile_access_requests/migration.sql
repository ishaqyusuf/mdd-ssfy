-- CreateTable
CREATE TABLE `MobileAccessRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `platform` ENUM('ANDROID', 'IOS') NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'INVITED', 'ACCEPTED', 'INSTALLED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `employeeNote` TEXT NULL,
    `statusNote` TEXT NULL,
    `internalNote` TEXT NULL,
    `invitationProvider` VARCHAR(80) NULL,
    `externalReference` VARCHAR(255) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `invitedAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `installedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `reviewedById` INTEGER NULL,
    `lastStatusChangedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MobileAccessRequest_userId_platform_key`(`userId`, `platform`),
    INDEX `MobileAccessRequest_status_platform_requestedAt_idx`(`status`, `platform`, `requestedAt`),
    INDEX `MobileAccessRequest_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MobileAccessRequestEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `actorId` INTEGER NOT NULL,
    `fromStatus` ENUM('REQUESTED', 'APPROVED', 'INVITED', 'ACCEPTED', 'INSTALLED', 'REJECTED', 'CANCELLED') NULL,
    `toStatus` ENUM('REQUESTED', 'APPROVED', 'INVITED', 'ACCEPTED', 'INSTALLED', 'REJECTED', 'CANCELLED') NOT NULL,
    `note` TEXT NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MobileAccessRequestEvent_requestId_createdAt_idx`(`requestId`, `createdAt`),
    INDEX `MobileAccessRequestEvent_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
