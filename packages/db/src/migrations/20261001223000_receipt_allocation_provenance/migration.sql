-- Receipt provenance makes cumulative partial-delivery replay idempotent.
ALTER TABLE `StockAllocation` ADD COLUMN `inboundDemandId` INTEGER NULL;
CREATE INDEX `StockAllocation_inboundDemandId_idx` ON `StockAllocation`(`inboundDemandId`);
-- Relations are managed by Prisma (relationMode = "prisma").
