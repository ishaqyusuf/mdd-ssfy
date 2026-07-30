-- CreateTable
CREATE TABLE `SalesFormPreference` (
    `userId` INTEGER NOT NULL,
    `mode` ENUM('NEW', 'LEGACY') NOT NULL,
    `source` VARCHAR(64) NOT NULL,
    `promptedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalesFormPreference_mode_updatedAt_idx`(`mode`, `updatedAt`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
