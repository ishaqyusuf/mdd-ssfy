/*
  Warnings:

  - You are about to drop the column `linePricingId` on the `LineItem` table. All the data in the column will be lost.
  - You are about to drop the column `linePricingId` on the `LineItemComponents` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[componentId]` on the table `LinePricing` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lineItemId]` on the table `LinePricing` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `LineItem_linePricingId_idx` ON `LineItem`;

-- DropIndex
DROP INDEX `LineItemComponents_linePricingId_idx` ON `LineItemComponents`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItem` DROP COLUMN `linePricingId`;

-- AlterTable
ALTER TABLE `LineItemComponents` DROP COLUMN `linePricingId`;

-- AlterTable
ALTER TABLE `LinePricing` ADD COLUMN `componentId` INTEGER NULL,
    ADD COLUMN `lineItemId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `LinePricing_componentId_key` ON `LinePricing`(`componentId`);

-- CreateIndex
CREATE UNIQUE INDEX `LinePricing_lineItemId_key` ON `LinePricing`(`lineItemId`);
