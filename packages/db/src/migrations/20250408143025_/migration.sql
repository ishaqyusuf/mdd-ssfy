-- CreateTable
CREATE TABLE `SalesTakeOff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SalesTakeOff_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesTakeOffSection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `salesTakeOffId` INTEGER NOT NULL,

    UNIQUE INDEX `SalesTakeOffSection_id_key`(`id`),
    INDEX `SalesTakeOffSection_salesTakeOffId_idx`(`salesTakeOffId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesTakeOffComponent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemUid` VARCHAR(191) NOT NULL,
    `lhQty` INTEGER NULL,
    `rhQty` INTEGER NULL,
    `totalQty` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `salesTakeOffSectionId` INTEGER NOT NULL,

    UNIQUE INDEX `SalesTakeOffComponent_id_key`(`id`),
    INDEX `SalesTakeOffComponent_salesTakeOffSectionId_idx`(`salesTakeOffSectionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
