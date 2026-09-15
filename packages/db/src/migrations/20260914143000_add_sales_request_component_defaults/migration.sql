-- AlterTable
ALTER TABLE `DykeStepProducts` ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `DykeStepProducts_dykeStepId_isDefault_idx` ON `DykeStepProducts`(`dykeStepId`, `isDefault`);
