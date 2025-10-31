-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ModelHasRoles` ADD COLUMN `organizationId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Projects` ADD COLUMN `orgId` INTEGER NULL;

-- AlterTable
ALTER TABLE `SalesOrders` ADD COLUMN `orgId` INTEGER NULL;

-- AlterTable
ALTER TABLE `WorkOrders` ADD COLUMN `orgId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Organization_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ModelHasRoles_organizationId_idx` ON `ModelHasRoles`(`organizationId`);

-- CreateIndex
CREATE INDEX `Projects_orgId_idx` ON `Projects`(`orgId`);

-- CreateIndex
CREATE INDEX `SalesOrders_orgId_idx` ON `SalesOrders`(`orgId`);

-- CreateIndex
CREATE INDEX `WorkOrders_orgId_idx` ON `WorkOrders`(`orgId`);
