-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `NoteRecipients` ADD COLUMN `sendEmail` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `sentAt` TIMESTAMP(0) NULL;
