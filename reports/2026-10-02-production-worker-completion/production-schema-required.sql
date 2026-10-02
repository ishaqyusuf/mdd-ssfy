-- Reviewed additive schema prerequisites for the latest jobs client.
-- Target: aws.connect.psdb.cloud/gndprodesk (Production). No reset or row deletion.

ALTER TABLE `InventoryVariant`
ADD COLUMN `stockAlertsEnabled` BOOLEAN NOT NULL DEFAULT true;

-- Nullable warehouse bucket for general and sale-linked shipment receipts.
ALTER TABLE `InboundShipmentItem` ADD COLUMN `location` VARCHAR(191) NULL;

-- Receipt provenance makes cumulative partial-delivery replay idempotent.
ALTER TABLE `StockAllocation` ADD COLUMN `inboundDemandId` INTEGER NULL;
CREATE INDEX `StockAllocation_inboundDemandId_idx` ON `StockAllocation`(`inboundDemandId`);
-- Relations are managed by Prisma (relationMode = "prisma").
