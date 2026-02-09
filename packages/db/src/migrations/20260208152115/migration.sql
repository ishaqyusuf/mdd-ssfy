/*
  Warnings:

  - You are about to drop the column `modelInstallTaskId` on the `BuilderTaskInstallCost` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `BuilderTaskInstallCost` DROP COLUMN `modelInstallTaskId`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityModelInstallTask` ADD COLUMN `builderTaskInstallCostId` INTEGER NULL;
