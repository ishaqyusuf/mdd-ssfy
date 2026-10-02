-- Nullable warehouse bucket for general and sale-linked shipment receipts.
ALTER TABLE `InboundShipmentItem` ADD COLUMN `location` VARCHAR(191) NULL;
