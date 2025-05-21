/*
  Warnings:

  - The primary key for the `ModelHasRoles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `modelType` on the `ModelHasRoles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ModelHasRoles` DROP PRIMARY KEY,
    DROP COLUMN `modelType`,
    ADD PRIMARY KEY (`roleId`, `modelId`);
