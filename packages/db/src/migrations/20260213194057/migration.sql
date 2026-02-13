/*
  Warnings:

  - You are about to drop the column `jobId` on the `HomeTasks` table. All the data in the column will be lost.
  - You are about to drop the column `jobHomeTaskId` on the `JobInstallTasks` table. All the data in the column will be lost.
  - You are about to drop the `JobHomeTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `HomeTasks_createdAt_deletedAt_produceable_billable_addon_dec_idx` ON `HomeTasks`;

-- DropIndex
DROP INDEX `HomeTasks_jobId_idx` ON `HomeTasks`;

-- DropIndex
DROP INDEX `JobInstallTasks_jobHomeTaskId_idx` ON `JobInstallTasks`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `HomeTasks` DROP COLUMN `jobId`;

-- AlterTable
ALTER TABLE `JobInstallTasks` DROP COLUMN `jobHomeTaskId`;

-- AlterTable
ALTER TABLE `Jobs` ADD COLUMN `builderTaskId` INTEGER NULL;

-- DropTable
DROP TABLE `JobHomeTask`;

-- CreateIndex
CREATE INDEX `HomeTasks_createdAt_deletedAt_produceable_billable_addon_dec_idx` ON `HomeTasks`(`createdAt`, `deletedAt`, `produceable`, `billable`, `addon`, `deco`, `punchout`, `installable`, `taskName`, `projectId`);
