-- CreateTable
CREATE TABLE `SalesCompletionRecord` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(64) NOT NULL,
    `cancellationRequestId` VARCHAR(64) NULL,
    `salesOrderId` INTEGER NOT NULL,
    `milestone` ENUM('PRODUCTION_COMPLETED', 'FULFILLMENT_COMPLETED') NOT NULL,
    `completionMethod` ENUM('STATUS_ONLY', 'FULL_WORKFLOW') NOT NULL,
    `state` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `activeKey` VARCHAR(191) NULL,
    `effectiveAt` TIMESTAMP(0) NULL,
    `recordedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `recordedById` INTEGER NOT NULL,
    `cancelledAt` TIMESTAMP(0) NULL,
    `cancelledById` INTEGER NULL,
    `cancellationReason` TEXT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesCompletionRecord_requestId_key`(`requestId`),
    UNIQUE INDEX `SalesCompletionRecord_cancellationRequestId_key`(`cancellationRequestId`),
    UNIQUE INDEX `SalesCompletionRecord_activeKey_key`(`activeKey`),
    INDEX `SalesCompletionRecord_salesOrderId_state_milestone_idx`(`salesOrderId`, `state`, `milestone`),
    INDEX `SalesCompletionRecord_completionMethod_recordedAt_idx`(`completionMethod`, `recordedAt`),
    INDEX `SalesCompletionRecord_milestone_effectiveAt_idx`(`milestone`, `effectiveAt`),
    INDEX `SalesCompletionRecord_state_cancelledAt_idx`(`state`, `cancelledAt`),
    INDEX `SalesCompletionRecord_recordedById_recordedAt_idx`(`recordedById`, `recordedAt`),
    INDEX `SalesCompletionRecord_cancelledById_cancelledAt_idx`(`cancelledById`, `cancelledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the canonical view/edit permission rows without granting either row to a role.
INSERT INTO `Permissions` (`name`, `createdAt`, `updatedAt`)
SELECT 'view status only sales completion', CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
    SELECT 1 FROM `Permissions`
    WHERE `name` = 'view status only sales completion' AND `deletedAt` IS NULL
);

INSERT INTO `Permissions` (`name`, `createdAt`, `updatedAt`)
SELECT 'edit status only sales completion', CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
    SELECT 1 FROM `Permissions`
    WHERE `name` = 'edit status only sales completion' AND `deletedAt` IS NULL
);
