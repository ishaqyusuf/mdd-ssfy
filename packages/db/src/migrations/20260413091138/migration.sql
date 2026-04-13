-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItemComponents` ADD COLUMN `qtyAllocated` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `qtyInbound` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `qtyReceived` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `status` ENUM('pending', 'allocated', 'partially_allocated', 'inbound_required', 'partially_received', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE `StockAllocation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lineItemComponentId` INTEGER NOT NULL,
    `inventoryStockId` INTEGER NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `qty` DOUBLE NOT NULL,
    `status` ENUM('reserved', 'picked', 'consumed', 'released') NOT NULL DEFAULT 'reserved',
    `notes` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `StockAllocation_lineItemComponentId_idx`(`lineItemComponentId`),
    INDEX `StockAllocation_inventoryStockId_idx`(`inventoryStockId`),
    INDEX `StockAllocation_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundDemand` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lineItemComponentId` INTEGER NOT NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `qty` DOUBLE NOT NULL,
    `qtyReceived` DOUBLE NOT NULL DEFAULT 0,
    `inboundShipmentItemId` INTEGER NULL,
    `status` ENUM('pending', 'ordered', 'partially_received', 'received', 'cancelled') NOT NULL DEFAULT 'pending',
    `notes` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundDemand_lineItemComponentId_idx`(`lineItemComponentId`),
    INDEX `InboundDemand_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InboundDemand_inboundShipmentItemId_idx`(`inboundShipmentItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
