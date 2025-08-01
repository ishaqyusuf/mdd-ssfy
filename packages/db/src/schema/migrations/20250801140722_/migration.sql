/*
  Warnings:

  - A unique constraint covering the columns `[path,deletedAt]` on the table `Attachment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bucket` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Attachment` ADD COLUMN `bucket` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `Attachment_path_deletedAt_key` ON `Attachment`(`path`, `deletedAt`);
