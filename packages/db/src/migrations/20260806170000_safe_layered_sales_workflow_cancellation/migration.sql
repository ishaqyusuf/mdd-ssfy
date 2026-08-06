-- CreateTable
CREATE TABLE `SalesWorkflowCancellation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` VARCHAR(64) NOT NULL,
    `salesOrderId` INTEGER NOT NULL,
    `action` VARCHAR(32) NOT NULL,
    `reason` TEXT NOT NULL,
    `revision` VARCHAR(64) NOT NULL,
    `beforeState` JSON NOT NULL,
    `result` JSON NOT NULL,
    `performedByUserId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `SalesWorkflowCancellation_requestId_key`(`requestId`),
    INDEX `SalesWorkflowCancellation_salesOrderId_createdAt_idx`(`salesOrderId`, `createdAt`),
    INDEX `SalesWorkflowCancellation_performedByUserId_createdAt_idx`(`performedByUserId`, `createdAt`),
    INDEX `SalesWorkflowCancellation_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
