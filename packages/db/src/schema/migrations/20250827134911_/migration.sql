/*
  Warnings:

  - You are about to drop the column `totalCost` on the `LineItemComponents` table. All the data in the column will be lost.
  - You are about to drop the column `unitCost` on the `LineItemComponents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `LineItemComponents` DROP COLUMN `totalCost`,
    DROP COLUMN `unitCost`,
    ADD COLUMN `costPrice` INTEGER NULL,
    ADD COLUMN `required` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `salesPrice` INTEGER NULL,
    ADD COLUMN `unitCostPrice` INTEGER NULL,
    ADD COLUMN `unitSalesPrice` INTEGER NULL;
