/*
  Warnings:

  - You are about to drop the `Inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryStock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryTypeAttribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryVariantAttribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryVariantPrice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Supplier` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- DropTable
DROP TABLE `Inventory`;

-- DropTable
DROP TABLE `InventoryCategory`;

-- DropTable
DROP TABLE `InventoryLog`;

-- DropTable
DROP TABLE `InventoryStock`;

-- DropTable
DROP TABLE `InventoryType`;

-- DropTable
DROP TABLE `InventoryTypeAttribute`;

-- DropTable
DROP TABLE `InventoryVariant`;

-- DropTable
DROP TABLE `InventoryVariantAttribute`;

-- DropTable
DROP TABLE `InventoryVariantPrice`;

-- DropTable
DROP TABLE `Supplier`;
