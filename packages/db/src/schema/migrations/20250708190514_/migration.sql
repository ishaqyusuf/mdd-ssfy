-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `InventoryType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `InventoryType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VariantAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,

    UNIQUE INDEX `VariantAttribute_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryTypeAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryTypeId` INTEGER NOT NULL,
    `attributeId` INTEGER NOT NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `InventoryTypeAttribute_inventoryTypeId_idx`(`inventoryTypeId`),
    INDEX `InventoryTypeAttribute_attributeId_idx`(`attributeId`),
    UNIQUE INDEX `InventoryTypeAttribute_inventoryTypeId_attributeId_key`(`inventoryTypeId`, `attributeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `parentId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    INDEX `InventoryCategory_parentId_idx`(`parentId`),
    UNIQUE INDEX `InventoryCategory_name_parentId_key`(`name`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `uid` VARCHAR(191) NOT NULL,
    `typeId` INTEGER NOT NULL,
    `categoryId` INTEGER NULL,
    `unit` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `Inventory_typeId_idx`(`typeId`),
    INDEX `Inventory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `variantTitle` VARCHAR(191) NULL,
    `img` VARCHAR(191) NULL,
    `prodUid` VARCHAR(191) NOT NULL,
    `depUid` VARCHAR(191) NULL,
    `inventoryId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InventoryVariant_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariantAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `variantId` INTEGER NOT NULL,
    `attributeId` INTEGER NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    INDEX `InventoryVariantAttribute_variantId_idx`(`variantId`),
    INDEX `InventoryVariantAttribute_attributeId_idx`(`attributeId`),
    UNIQUE INDEX `InventoryVariantAttribute_variantId_attributeId_key`(`variantId`, `attributeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariantPrice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesPrice` DOUBLE NULL,
    `costPrice` DOUBLE NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InventoryVariantPrice_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryVariantId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `location` VARCHAR(191) NULL,
    `supplierId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InventoryStock_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryStock_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `notes` VARCHAR(191) NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `inventoryId` INTEGER NULL,

    INDEX `InventoryLog_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryLog_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
