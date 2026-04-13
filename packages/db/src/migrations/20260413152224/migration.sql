-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Inventory` ADD COLUMN `sourceComponentUid` VARCHAR(191) NULL,
    ADD COLUMN `sourceCustom` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sourceStepUid` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Inventory_sourceStepUid_idx` ON `Inventory`(`sourceStepUid`);

-- CreateIndex
CREATE INDEX `Inventory_sourceComponentUid_idx` ON `Inventory`(`sourceComponentUid`);

-- CreateIndex
CREATE INDEX `Inventory_sourceCustom_idx` ON `Inventory`(`sourceCustom`);
