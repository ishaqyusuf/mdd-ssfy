/*
  Warnings:

  - You are about to drop the column `notePadContactsId` on the `AssignedUserNoteChannel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `AssignedUserNoteChannel` DROP COLUMN `notePadContactsId`,
    ADD COLUMN `notePadContactId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;
