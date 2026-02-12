-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `NoteRecipients` ADD COLUMN `status` ENUM('read', 'unread', 'archived') NULL;
