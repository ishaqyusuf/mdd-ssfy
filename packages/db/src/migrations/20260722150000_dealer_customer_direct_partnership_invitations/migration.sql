-- The recruitment tables were originally introduced through db push while the
-- launch gate was still in development. Recreate the pre-expansion invitation
-- shape when Prisma builds a fresh shadow database so this additive migration
-- remains replayable from migration history.
CREATE TABLE IF NOT EXISTS `DealerRecruitmentInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `customerId` INTEGER NOT NULL,
    `recipientEmail` VARCHAR(255) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` TIMESTAMP(0) NOT NULL,
    `firstOpenedAt` TIMESTAMP(0) NULL,
    `lastOpenedAt` TIMESTAMP(0) NULL,
    `openCount` INTEGER NOT NULL DEFAULT 0,
    `deliveredAt` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DealerRecruitmentInvitation_tokenHash_key`(`tokenHash`),
    INDEX `DealerRecruitmentInvitation_campaignId_customerId_createdAt_idx`(`campaignId`, `customerId`, `createdAt`),
    INDEX `DealerRecruitmentInvitation_customerId_expiresAt_idx`(`customerId`, `expiresAt`),
    INDEX `DealerRecruitmentInvitation_deliveredAt_idx`(`deliveredAt`),
    INDEX `DealerRecruitmentInvitation_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `DealerRecruitmentInvitation` ADD COLUMN `deliveryAttemptedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `deliveryFailure` TEXT NULL,
    ADD COLUMN `deliveryStatus` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `providerMessageId` VARCHAR(255) NULL,
    ADD COLUMN `providerStatus` VARCHAR(100) NULL,
    ADD COLUMN `revokedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `sentById` INTEGER NULL,
    ADD COLUMN `source` ENUM('SALES_EMAIL_BANNER', 'MANUAL_CUSTOMER') NOT NULL DEFAULT 'SALES_EMAIL_BANNER',
    ADD COLUMN `supersededAt` TIMESTAMP(0) NULL,
    ADD COLUMN `supersededById` VARCHAR(191) NULL;

-- Existing recruitment invitations came from sales-email banners. Provider-accepted
-- records are identified by their historical deliveredAt timestamp.
UPDATE `DealerRecruitmentInvitation`
SET `deliveryStatus` = 'SENT',
    `deliveryAttemptedAt` = COALESCE(`deliveryAttemptedAt`, `deliveredAt`)
WHERE `deliveredAt` IS NOT NULL;

-- CreateTable
CREATE TABLE `DealerRecruitmentCustomerState` (
    `customerId` INTEGER NOT NULL,
    `latestInvitationId` VARCHAR(191) NULL,
    `sendLeaseId` VARCHAR(191) NULL,
    `sendLeaseExpiresAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DealerRecruitmentCustomerState_latestInvitationId_key`(`latestInvitationId`),
    UNIQUE INDEX `DealerRecruitmentCustomerState_sendLeaseId_key`(`sendLeaseId`),
    INDEX `DealerRecruitmentCustomerState_sendLeaseExpiresAt_idx`(`sendLeaseExpiresAt`),
    PRIMARY KEY (`customerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `DealerRecruitmentInvitation_customerId_source_createdAt_idx` ON `DealerRecruitmentInvitation`(`customerId`, `source`, `createdAt`);

-- CreateIndex
CREATE INDEX `DealerRecruitmentInvitation_deliveryStatus_deliveryAttempted_idx` ON `DealerRecruitmentInvitation`(`deliveryStatus`, `deliveryAttemptedAt`);

-- CreateIndex
CREATE INDEX `DealerRecruitmentInvitation_sentById_idx` ON `DealerRecruitmentInvitation`(`sentById`);

-- CreateIndex
CREATE INDEX `DealerRecruitmentInvitation_revokedAt_supersededAt_idx` ON `DealerRecruitmentInvitation`(`revokedAt`, `supersededAt`);
