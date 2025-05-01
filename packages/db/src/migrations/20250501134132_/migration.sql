/*
  Warnings:

  - Added the required column `status` to the `Payroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `SalesPayout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Payroll` ADD COLUMN `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL;

-- AlterTable
ALTER TABLE `SalesPayout` ADD COLUMN `amount` DOUBLE NOT NULL;

-- CreateTable
CREATE TABLE `PayrollHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'PAID') NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `payrollId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `PayrollHistory_id_key`(`id`),
    INDEX `PayrollHistory_userId_idx`(`userId`),
    INDEX `PayrollHistory_payrollId_idx`(`payrollId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
