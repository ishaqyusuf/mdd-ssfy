/*
  Warnings:

  - You are about to drop the column `sendEmail` on the `NoteRecipients` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `NoteRecipients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `NoteRecipients` DROP COLUMN `sendEmail`,
    DROP COLUMN `sentAt`;
