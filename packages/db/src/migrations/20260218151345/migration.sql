/*
  Warnings:

  - You are about to drop the column `email` on the `NotePadContacts` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `NotePadContacts` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNo` on the `NotePadContacts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `NotePadContacts_name_email_phoneNo_key` ON `NotePadContacts`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `NotePadContacts` DROP COLUMN `email`,
    DROP COLUMN `name`,
    DROP COLUMN `phoneNo`;
