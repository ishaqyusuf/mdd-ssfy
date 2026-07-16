-- Payment review starts from the current rollout moment.
-- Existing queued rows are cleared so only newly recorded payments enter review.
UPDATE `SalesPayments`
SET
    `reviewStatus` = NULL,
    `reviewedAt` = NULL,
    `reviewedById` = NULL,
    `reviewMethod` = NULL,
    `reviewedByAction` = NULL,
    `reviewNote` = NULL
WHERE `reviewStatus` = 'needs_review';

-- Future review rows must be explicitly created by payment write paths.
ALTER TABLE `SalesPayments`
    MODIFY COLUMN `origin` VARCHAR(191) NULL,
    MODIFY COLUMN `reviewStatus` VARCHAR(191) NULL;
