-- AlterTable
ALTER TABLE `BuilderTask` ADD COLUMN `taskIndex` DOUBLE NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;
