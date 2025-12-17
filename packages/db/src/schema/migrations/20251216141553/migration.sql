-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `token` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL;
