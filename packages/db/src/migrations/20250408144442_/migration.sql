/*
  Warnings:

  - A unique constraint covering the columns `[salesId]` on the table `SalesTakeOff` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `SalesTakeOff_salesId_key` ON `SalesTakeOff`(`salesId`);
