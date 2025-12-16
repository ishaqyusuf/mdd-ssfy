-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Homes` ADD COLUMN `organizationId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Organization` ADD COLUMN `primary` BOOLEAN NULL;
