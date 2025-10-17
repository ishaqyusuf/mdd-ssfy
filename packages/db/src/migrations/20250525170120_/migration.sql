/*
  Warnings:

  - You are about to drop the `GitTaskStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GitTaskTags` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `status` to the `GitTasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `GitTasks` ADD COLUMN `status` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `GitTaskStatus`;

-- DropTable
DROP TABLE `GitTaskTags`;

-- CreateTable
CREATE TABLE `GitStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `taskId` INTEGER NULL,
    `todosId` INTEGER NULL,

    UNIQUE INDEX `GitStatus_id_key`(`id`),
    INDEX `GitStatus_taskId_idx`(`taskId`),
    INDEX `GitStatus_todosId_idx`(`todosId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GitTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tagId` INTEGER NOT NULL,
    `gitTaskId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `todoId` INTEGER NULL,

    UNIQUE INDEX `GitTags_id_key`(`id`),
    INDEX `GitTags_gitTaskId_idx`(`gitTaskId`),
    INDEX `GitTags_tagId_idx`(`tagId`),
    INDEX `GitTags_todoId_idx`(`todoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinPaymentInvoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `totalDuration` DOUBLE NULL,
    `totalAmount` DOUBLE NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinPayments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',
    `invoiceId` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `clockinPayoutId` INTEGER NULL,

    INDEX `ClockinPayments_invoiceId_idx`(`invoiceId`),
    INDEX `ClockinPayments_clockinPayoutId_idx`(`clockinPayoutId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinPayout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NULL,
    `exchangeRate` DOUBLE NULL,
    `amountInUSD` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clockIn` TIMESTAMP(0) NOT NULL,
    `clockOut` TIMESTAMP(0) NULL,
    `duration` DOUBLE NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `invoiceId` INTEGER NULL,

    UNIQUE INDEX `ClockinSession_invoiceId_key`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinBreak` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clockIn` TIMESTAMP(0) NOT NULL,
    `clockOut` TIMESTAMP(0) NULL,
    `duration` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `clockinId` INTEGER NULL,

    INDEX `ClockinBreak_clockinId_idx`(`clockinId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
