-- AlterTable
ALTER TABLE `OrderProductionSubmissions` ADD COLUMN `submittedById` INTEGER NULL;

-- CreateIndex
CREATE INDEX `OrderProductionSubmissions_submittedById_idx` ON `OrderProductionSubmissions`(`submittedById`);
