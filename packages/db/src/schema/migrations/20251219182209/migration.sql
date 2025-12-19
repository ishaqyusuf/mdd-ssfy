/*
  Warnings:

  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `email` VARCHAR(255) NOT NULL,
    ADD COLUMN `emailVerifiedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `name` VARCHAR(255) NULL;
