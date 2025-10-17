-- CreateTable
CREATE TABLE `SalesPayroll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `userId` INTEGER NOT NULL,
    `payoutId` INTEGER NULL,

    UNIQUE INDEX `SalesPayroll_id_key`(`id`),
    INDEX `SalesPayroll_userId_idx`(`userId`),
    INDEX `SalesPayroll_payoutId_idx`(`payoutId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollLineItems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NULL,
    `itemUid` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `salesPayrollId` INTEGER NOT NULL,

    UNIQUE INDEX `PayrollLineItems_id_key`(`id`),
    INDEX `PayrollLineItems_salesPayrollId_idx`(`salesPayrollId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesPayout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(191) NOT NULL,
    `payoutDate` DATETIME(3) NULL,
    `method` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `approvedById` INTEGER NULL,

    UNIQUE INDEX `SalesPayout_reference_key`(`reference`),
    INDEX `SalesPayout_approvedById_idx`(`approvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
