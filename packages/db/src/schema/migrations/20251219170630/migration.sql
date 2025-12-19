-- AlterTable
ALTER TABLE `Account` ADD COLUMN `userId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Users` ADD COLUMN `userId` VARCHAR(191) NULL;
