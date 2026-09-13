CREATE TABLE `SalesRequestPilotReviewDecision` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settingId` INTEGER NOT NULL,
    `periodStart` TIMESTAMP(0) NOT NULL,
    `periodEnd` TIMESTAMP(0) NOT NULL,
    `decision` VARCHAR(16) NOT NULL,
    `authority` JSON NOT NULL,
    `authorityDigest` VARCHAR(71) NOT NULL,
    `evidence` JSON NOT NULL,
    `evidenceDigest` VARCHAR(71) NOT NULL,
    `thresholdPolicy` JSON NOT NULL,
    `thresholdPolicyDigest` VARCHAR(71) NOT NULL,
    `thresholdPolicyVersion` VARCHAR(64) NOT NULL,
    `signoff` JSON NOT NULL,
    `reviewerUserId` INTEGER NOT NULL,
    `reviewedAt` TIMESTAMP(0) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `sales_req_pilot_review_period_key`(`settingId`, `periodStart`),
    INDEX `sales_req_pilot_review_setting_period_idx`(`settingId`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
