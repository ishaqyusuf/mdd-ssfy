-- AlterTable
ALTER TABLE `AssistantSalesRequestSession` ADD COLUMN `pendingPreview` JSON NULL;

-- AlterTable
ALTER TABLE `InboundShipmentItem` ADD COLUMN `location` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `InventoryVariant` ADD COLUMN `stockAlertsEnabled` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `MessagingConnection` ADD COLUMN `maxConversationsPerScan` INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN `maxMessagesPerScan` INTEGER NOT NULL DEFAULT 500,
    ADD COLUMN `maxSendsPerHour` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `overlapWindowSeconds` INTEGER NOT NULL DEFAULT 300;

-- AlterTable
ALTER TABLE `MessagingDevice` ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `label` VARCHAR(100) NOT NULL DEFAULT 'Chrome extension';

-- AlterTable
ALTER TABLE `StockAllocation` ADD COLUMN `inboundDemandId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `msg_device_token_hash_uq` ON `MessagingDevice`(`tokenHash`);

-- CreateIndex
CREATE INDEX `StockAllocation_inboundDemandId_idx` ON `StockAllocation`(`inboundDemandId`);

