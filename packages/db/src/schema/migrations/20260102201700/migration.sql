/*
  Warnings:

  - The primary key for the `ModelHasRoles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `organizationId` on table `ModelHasRoles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ModelHasRoles` DROP PRIMARY KEY,
    MODIFY `organizationId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`roleId`, `modelId`, `organizationId`);

-- AlterTable
ALTER TABLE `Organization` ADD COLUMN `phone` VARCHAR(191) NULL;
