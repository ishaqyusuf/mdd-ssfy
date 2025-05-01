/*
  Warnings:

  - You are about to drop the column `approvedById` on the `SalesPayout` table. All the data in the column will be lost.
  - You are about to drop the `PayrollLineItems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesPayroll` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `payeeId` to the `SalesPayout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payerId` to the `SalesPayout` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `SalesPayout_approvedById_idx` ON `SalesPayout`;

-- AlterTable
ALTER TABLE `SalesPayout` DROP COLUMN `approvedById`,
    ADD COLUMN `deletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `payeeId` INTEGER NOT NULL,
    ADD COLUMN `payerId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `PayrollLineItems`;

-- DropTable
DROP TABLE `SalesPayroll`;

-- CreateTable
CREATE TABLE `Payroll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `type` ENUM('COMMISSION', 'WAGE') NOT NULL,
    `description` VARCHAR(191) NULL,
    `orderId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `userId` INTEGER NOT NULL,
    `payoutId` INTEGER NULL,
    `productionSubmissionId` INTEGER NULL,
    `orderPaymentId` INTEGER NULL,

    UNIQUE INDEX `Payroll_id_key`(`id`),
    UNIQUE INDEX `Payroll_productionSubmissionId_key`(`productionSubmissionId`),
    UNIQUE INDEX `Payroll_orderPaymentId_key`(`orderPaymentId`),
    INDEX `Payroll_productionSubmissionId_idx`(`productionSubmissionId`),
    INDEX `Payroll_orderId_idx`(`orderId`),
    INDEX `Payroll_userId_idx`(`userId`),
    INDEX `Payroll_payoutId_idx`(`payoutId`),
    UNIQUE INDEX `Payroll_orderId_productionSubmissionId_orderPaymentId_key`(`orderId`, `productionSubmissionId`, `orderPaymentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SalesPayout_payeeId_idx` ON `SalesPayout`(`payeeId`);

-- CreateIndex
CREATE INDEX `SalesPayout_payerId_idx` ON `SalesPayout`(`payerId`);
