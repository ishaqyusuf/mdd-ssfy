-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `QtyControl_type_deletedAt_percentage_idx` ON `QtyControl`(`type`, `deletedAt`, `percentage`);

-- CreateIndex
CREATE INDEX `QtyControl_type_deletedAt_total_idx` ON `QtyControl`(`type`, `deletedAt`, `total`);
