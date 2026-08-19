-- CreateTable
CREATE TABLE `DispatchException` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderDeliveryId` INTEGER NOT NULL,
    `reasonCode` VARCHAR(64) NOT NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'open',
    `tripAction` VARCHAR(32) NOT NULL DEFAULT 'keep_assigned',
    `reportedById` INTEGER NOT NULL,
    `resolvedById` INTEGER NULL,
    `resolutionNote` TEXT NULL,
    `requestId` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `reportedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `resolvedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DispatchException_requestId_key`(`requestId`),
    INDEX `DispatchException_orderDeliveryId_status_deletedAt_idx`(`orderDeliveryId`, `status`, `deletedAt`),
    INDEX `DispatchException_status_reportedAt_idx`(`status`, `reportedAt`),
    INDEX `DispatchException_reportedById_reportedAt_idx`(`reportedById`, `reportedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DispatchException`
    ADD CONSTRAINT `DispatchException_orderDeliveryId_fkey`
    FOREIGN KEY (`orderDeliveryId`) REFERENCES `OrderDelivery`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
