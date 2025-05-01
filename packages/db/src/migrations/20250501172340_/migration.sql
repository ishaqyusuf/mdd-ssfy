/*
  Warnings:

  - A unique constraint covering the columns `[type,orderId]` on the table `SalesExtraCosts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `SalesExtraCosts` ADD COLUMN `editable` BOOLEAN NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `SalesExtraCosts_type_orderId_key` ON `SalesExtraCosts`(`type`, `orderId`);
