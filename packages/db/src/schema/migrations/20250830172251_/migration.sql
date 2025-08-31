-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `ShippingConfiguration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method` ENUM('FLAT_RATE', 'WEIGHT_BASED', 'PRICE_BASED', 'ZONE_BASED', 'PER_ITEM', 'DIMENSIONAL_WEIGHT') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShippingConfiguration_method_key`(`method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FlatRate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configId` INTEGER NOT NULL,
    `rate` DOUBLE NOT NULL,

    UNIQUE INDEX `FlatRate_configId_key`(`configId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeightBased` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configId` INTEGER NOT NULL,
    `baseFee` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `WeightBased_configId_key`(`configId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeightBasedRate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weightBasedId` INTEGER NOT NULL,
    `fromWeight` DOUBLE NOT NULL,
    `toWeight` DOUBLE NOT NULL,
    `ratePerUnit` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceBased` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configId` INTEGER NOT NULL,

    UNIQUE INDEX `PriceBased_configId_key`(`configId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceBasedRate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `priceBasedId` INTEGER NOT NULL,
    `fromPrice` DOUBLE NOT NULL,
    `toPrice` DOUBLE NOT NULL,
    `shippingFee` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZoneBased` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configId` INTEGER NOT NULL,

    UNIQUE INDEX `ZoneBased_configId_key`(`configId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShippingZone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `zoneBasedId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `countries` VARCHAR(191) NULL,
    `states` VARCHAR(191) NULL,
    `zipCodes` VARCHAR(191) NULL,
    `rate` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configId` INTEGER NOT NULL,
    `rate` DOUBLE NOT NULL,

    UNIQUE INDEX `PerItem_configId_key`(`configId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DimensionalWeight` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configId` INTEGER NOT NULL,
    `divisor` DOUBLE NOT NULL,
    `baseFee` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `DimensionalWeight_configId_key`(`configId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
