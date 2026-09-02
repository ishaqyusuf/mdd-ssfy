-- AlterTable
ALTER TABLE `SalesOrders` ADD COLUMN `archivedAt` TIMESTAMP(0) NULL;

-- CreateIndex
CREATE INDEX `idx_sales_orders_workspace_archive` ON `SalesOrders`(`type`, `deletedAt`, `archivedAt`, `createdAt`, `id`);
