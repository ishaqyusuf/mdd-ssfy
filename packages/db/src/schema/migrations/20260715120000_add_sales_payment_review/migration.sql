-- Add payment review tracking for the sales invoice review queue.
ALTER TABLE `SalesPayments`
    ADD COLUMN `origin` VARCHAR(191) NULL DEFAULT 'office',
    ADD COLUMN `reviewStatus` VARCHAR(191) NULL DEFAULT 'needs_review',
    ADD COLUMN `reviewedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `reviewedById` INTEGER NULL,
    ADD COLUMN `reviewMethod` VARCHAR(191) NULL,
    ADD COLUMN `reviewedByAction` VARCHAR(191) NULL,
    ADD COLUMN `reviewNote` TEXT NULL;

-- Existing payments predate this review workflow and should not enter the queue.
UPDATE `SalesPayments`
SET
    `origin` = COALESCE(`origin`, 'office'),
    `reviewStatus` = 'reviewed',
    `reviewedAt` = COALESCE(`createdAt`, CURRENT_TIMESTAMP(0)),
    `reviewMethod` = 'legacy',
    `reviewNote` = 'Reviewed during payment review migration.'
WHERE `reviewStatus` IS NULL OR `reviewStatus` = 'needs_review';

CREATE INDEX `SalesPayments_orderId_reviewStatus_createdAt_idx` ON `SalesPayments`(`orderId`, `reviewStatus`, `createdAt`);
CREATE INDEX `SalesPayments_reviewStatus_createdAt_idx` ON `SalesPayments`(`reviewStatus`, `createdAt`);

-- Payment review relies on sales reps seeing payment notifications in the notification center.
-- Older channel seed rows may have NULL support flags, which the resolver treats as disabled.
UPDATE `NoteChannels`
SET `inAppSupport` = 1
WHERE `channelName` IN (
    'sales_checkout_success',
    'sales_payment_recorded',
    'sales_customer_payment_received'
)
AND `inAppSupport` IS NULL;
