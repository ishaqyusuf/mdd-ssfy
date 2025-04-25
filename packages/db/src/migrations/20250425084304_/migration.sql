/*
  Warnings:

  - You are about to drop the `Inventories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryProducts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderInventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesInvoiceItems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesInvoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesItemSupply` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesJobs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `Inventories`;

-- DropTable
DROP TABLE `InventoryProducts`;

-- DropTable
DROP TABLE `OrderInventory`;

-- DropTable
DROP TABLE `ProductVariants`;

-- DropTable
DROP TABLE `SalesInvoiceItems`;

-- DropTable
DROP TABLE `SalesInvoices`;

-- DropTable
DROP TABLE `SalesItemSupply`;

-- DropTable
DROP TABLE `SalesJobs`;

-- CreateIndex
CREATE INDEX `Todos_gitTasksId_idx` ON `Todos`(`gitTasksId`);
