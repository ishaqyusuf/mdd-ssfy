-- AlterTable
ALTER TABLE `Payroll` ADD COLUMN `itemUid` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Payroll_itemUid_idx` ON `Payroll`(`itemUid`);
