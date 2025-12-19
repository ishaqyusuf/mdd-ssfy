/*
  Warnings:

  - You are about to drop the column `userId` on the `Users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `userId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Users` DROP COLUMN `userId`;

-- CreateIndex
CREATE UNIQUE INDEX `User_userId_key` ON `User`(`userId`);
