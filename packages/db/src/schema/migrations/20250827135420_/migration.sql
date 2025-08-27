/*
  Warnings:

  - You are about to drop the column `cartItemId` on the `LineItem` table. All the data in the column will be lost.
  - You are about to drop the `CartItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `LineItem_cartItemId_idx` ON `LineItem`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItem` DROP COLUMN `cartItemId`;

-- DropTable
DROP TABLE `CartItem`;
