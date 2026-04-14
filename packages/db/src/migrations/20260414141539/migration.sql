-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InboundShipment` MODIFY `status` ENUM('pending', 'in_progress', 'completed', 'issue_open', 'closed', 'cancelled') NOT NULL;

-- AlterTable
ALTER TABLE `InboundShipmentItem` ADD COLUMN `qtyGood` DOUBLE NULL,
    ADD COLUMN `qtyIssue` DOUBLE NULL;

-- AlterTable
ALTER TABLE `InventoryCategory` ADD COLUMN `stockMode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `StockAllocation` MODIFY `status` ENUM('pending_review', 'approved', 'reserved', 'picked', 'consumed', 'released', 'cancelled') NOT NULL DEFAULT 'reserved';

-- CreateTable
CREATE TABLE `InboundShipmentItemIssue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inboundShipmentItemId` INTEGER NOT NULL,
    `issueType` ENUM('damaged', 'missing', 'wrong_item', 'over_received', 'quality_hold') NOT NULL,
    `status` ENUM('open', 'supplier_notified', 'replacement_pending', 'resolved', 'cancelled') NOT NULL DEFAULT 'open',
    `resolutionType` ENUM('return_to_supplier', 'replacement_requested', 'credit_requested', 'write_off', 'accepted_with_adjustment') NULL,
    `reportedQty` DOUBLE NOT NULL,
    `resolvedQty` DOUBLE NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `reportedByUserId` INTEGER NULL,
    `resolvedByUserId` INTEGER NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundShipmentItemIssue_inboundShipmentItemId_idx`(`inboundShipmentItemId`),
    INDEX `InboundShipmentItemIssue_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
