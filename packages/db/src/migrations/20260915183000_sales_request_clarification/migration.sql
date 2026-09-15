-- CreateTable
CREATE TABLE `SalesRequestClarificationSession` (
    `id` VARCHAR(36) NOT NULL,
    `actorUserId` INTEGER NOT NULL,
    `saleType` VARCHAR(16) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `configurationRevision` VARCHAR(128) NOT NULL,
    `sourceText` LONGTEXT NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(24) NOT NULL,
    `questions` JSON NOT NULL,
    `answers` JSON NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sales_req_clarification_owner_idx`(`actorUserId`, `scope`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
