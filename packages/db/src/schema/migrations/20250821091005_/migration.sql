/*
  Warnings:

  - You are about to drop the column `quantity` on the `InboundShipmentItem` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `InventoryLog` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `InventoryStock` table. All the data in the column will be lost.
  - Added the required column `qty` to the `InboundShipmentItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty` to the `InventoryLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty` to the `InventoryStock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InboundShipmentItem` DROP COLUMN `quantity`,
    ADD COLUMN `qty` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `InventoryLog` DROP COLUMN `quantity`,
    ADD COLUMN `costPrice` DOUBLE NULL,
    ADD COLUMN `inventoryStockId` INTEGER NULL,
    ADD COLUMN `qty` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `InventoryStock` DROP COLUMN `quantity`,
    ADD COLUMN `price` DOUBLE NULL,
    ADD COLUMN `qty` DOUBLE NOT NULL;

-- CreateIndex
CREATE INDEX `InventoryLog_inventoryStockId_idx` ON `InventoryLog`(`inventoryStockId`);
