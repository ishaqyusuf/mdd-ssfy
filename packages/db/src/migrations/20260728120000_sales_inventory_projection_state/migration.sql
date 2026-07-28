CREATE TABLE `SalesInventoryProjectionState` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'syncing',
    `version` INTEGER NOT NULL DEFAULT 1,
    `needCount` INTEGER NOT NULL DEFAULT 0,
    `requiredQty` DOUBLE NOT NULL DEFAULT 0,
    `source` VARCHAR(32) NULL,
    `lastError` TEXT NULL,
    `startedAt` TIMESTAMP(0) NULL,
    `completedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SalesInventoryProjectionState_salesOrderId_key` (`salesOrderId`),
    INDEX `SalesInventoryProjectionState_status_updatedAt_idx` (`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
