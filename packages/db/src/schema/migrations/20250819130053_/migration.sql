-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Inventory` ADD COLUMN `averageRating` DOUBLE NULL,
    ADD COLUMN `discountId` VARCHAR(191) NULL,
    ADD COLUMN `featuredEndDate` DATETIME(3) NULL,
    ADD COLUMN `featuredOrder` INTEGER NULL,
    ADD COLUMN `featuredStartDate` DATETIME(3) NULL,
    ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isTopProduct` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastOrderedAt` DATETIME(3) NULL,
    ADD COLUMN `orderCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `ratingCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `salesAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `topProductOrder` INTEGER NULL,
    ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `InventoryCategory` ADD COLUMN `discountId` VARCHAR(191) NULL,
    ADD COLUMN `primary` BOOLEAN NULL;

-- CreateTable
CREATE TABLE `CartItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WisthListItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryActivity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NULL,
    `sn` INTEGER NULL DEFAULT 0,
    `title` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `qty` DOUBLE NULL DEFAULT 1,
    `unitCost` DOUBLE NULL,
    `totalCost` DOUBLE NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `activityType` ENUM('CART', 'WISHLIST', 'QUOTE', 'SALE') NOT NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `wisthListItemId` INTEGER NULL,
    `cartItemId` INTEGER NULL,
    `saleId` INTEGER NULL,

    INDEX `InventoryActivity_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryActivity_wisthListItemId_idx`(`wisthListItemId`),
    INDEX `InventoryActivity_cartItemId_idx`(`cartItemId`),
    INDEX `InventoryActivity_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventorySalesItems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `comment` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `ProductReview_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Discount` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('percentage', 'fixed_amount', 'free_shipping') NOT NULL,
    `value` DOUBLE NOT NULL,
    `minOrderAmount` DOUBLE NULL,
    `maxUses` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `applicableToAll` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Discount_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `customerId` INTEGER NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `referrer` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductView_inventoryId_idx`(`inventoryId`),
    INDEX `ProductView_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductMetric` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `dailyViews` INTEGER NOT NULL DEFAULT 0,
    `dailyOrders` INTEGER NOT NULL DEFAULT 0,
    `dailySales` DOUBLE NOT NULL DEFAULT 0,
    `weeklyViews` INTEGER NOT NULL DEFAULT 0,
    `weeklyOrders` INTEGER NOT NULL DEFAULT 0,
    `weeklySales` DOUBLE NOT NULL DEFAULT 0,
    `monthlyViews` INTEGER NOT NULL DEFAULT 0,
    `monthlyOrders` INTEGER NOT NULL DEFAULT 0,
    `monthlySales` DOUBLE NOT NULL DEFAULT 0,
    `totalViews` INTEGER NOT NULL DEFAULT 0,
    `totalOrders` INTEGER NOT NULL DEFAULT 0,
    `totalSales` DOUBLE NOT NULL DEFAULT 0,
    `lastUpdated` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductMetric_inventoryId_key`(`inventoryId`),
    INDEX `ProductMetric_dailyViews_idx`(`dailyViews`),
    INDEX `ProductMetric_weeklyViews_idx`(`weeklyViews`),
    INDEX `ProductMetric_monthlyViews_idx`(`monthlyViews`),
    INDEX `ProductMetric_totalViews_idx`(`totalViews`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeaturedProduct` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `section` ENUM('homepage_hero', 'homepage_featured', 'homepage_trending', 'category_featured', 'seasonal_deals', 'new_arrivals', 'best_sellers') NOT NULL,
    `categoryId` INTEGER NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FeaturedProduct_section_idx`(`section`),
    INDEX `FeaturedProduct_isActive_idx`(`isActive`),
    INDEX `FeaturedProduct_startDate_idx`(`startDate`),
    INDEX `FeaturedProduct_endDate_idx`(`endDate`),
    INDEX `FeaturedProduct_position_idx`(`position`),
    INDEX `FeaturedProduct_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `FeaturedProduct_inventoryId_section_categoryId_key`(`inventoryId`, `section`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Inventory_discountId_idx` ON `Inventory`(`discountId`);

-- CreateIndex
CREATE INDEX `InventoryCategory_discountId_idx` ON `InventoryCategory`(`discountId`);
