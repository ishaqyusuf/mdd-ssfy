-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `WisthListItem` ADD COLUMN `guestId` VARCHAR(191) NULL,
    ADD COLUMN `userId` INTEGER NULL;
