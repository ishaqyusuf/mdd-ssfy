-- AlterTable
ALTER TABLE `BuilderTaskInstallCost` ADD COLUMN `modelInstallTaskId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;
