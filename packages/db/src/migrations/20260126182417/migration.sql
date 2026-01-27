/*
  Warnings:

  - You are about to drop the column `communityModelsId` on the `CommunityTemplateHistory` table. All the data in the column will be lost.
  - The primary key for the `ModelHasRoles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `GitStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GitTags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GitTasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Todos` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[verificationToken]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `ModelHasRoles` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `CommunityTemplateHistory_communityModelsId_idx` ON `CommunityTemplateHistory`;

-- AlterTable
ALTER TABLE `AddressBooks` ADD COLUMN `regionId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CommunityModels` ADD COLUMN `version` ENUM('v1', 'v2') NULL;

-- AlterTable
ALTER TABLE `CommunityTemplateHistory` DROP COLUMN `communityModelsId`,
    ADD COLUMN `communityModelId` INTEGER NULL,
    ADD COLUMN `homeTemplateId` INTEGER NULL,
    ADD COLUMN `slug` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CustomerTransaction` ADD COLUMN `statusReason` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CustomerTransactionStatus` ADD COLUMN `reason` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Customers` ADD COLUMN `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Homes` ADD COLUMN `organizationId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Jobs` ADD COLUMN `controlId` VARCHAR(191) NULL,
    ADD COLUMN `isCustom` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `ModelHasRoles` DROP PRIMARY KEY,
    ADD COLUMN `organizationId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`roleId`, `modelId`, `organizationId`);

-- AlterTable
ALTER TABLE `OrderItemDelivery` ADD COLUMN `note` VARCHAR(191) NULL,
    ADD COLUMN `packedBy` VARCHAR(191) NULL,
    ADD COLUMN `packingStatus` VARCHAR(191) NULL,
    ADD COLUMN `packingUid` VARCHAR(191) NULL,
    ADD COLUMN `unpackedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Projects` ADD COLUMN `orgId` INTEGER NULL;

-- AlterTable
ALTER TABLE `SalesOrders` ADD COLUMN `orgId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `token` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL,
    ADD COLUMN `userId2` VARCHAR(191) NULL,
    MODIFY `session_token` VARCHAR(191) NULL,
    MODIFY `expires` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Users` ADD COLUMN `type` ENUM('CUSTOMER', 'EMPLOYEE', 'MANAGER') NULL,
    ADD COLUMN `verificationToken` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `WorkOrders` ADD COLUMN `orgId` INTEGER NULL;

-- DropTable
DROP TABLE `GitStatus`;

-- DropTable
DROP TABLE `GitTags`;

-- DropTable
DROP TABLE `GitTasks`;

-- DropTable
DROP TABLE `Tags`;

-- DropTable
DROP TABLE `Todos`;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NULL,
    `refreshToken` VARCHAR(191) NULL,
    `idToken` VARCHAR(191) NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `updatedAt` DATETIME(3) NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Account_providerId_accountId_key`(`providerId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL,
    `emailVerifiedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Verification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Backlogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BacklogNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `backlogId` INTEGER NULL,

    UNIQUE INDEX `BacklogNote_id_key`(`id`),
    INDEX `BacklogNote_backlogId_idx`(`backlogId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BacklogTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tagId` INTEGER NOT NULL,
    `backlogId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `todoId` INTEGER NULL,

    UNIQUE INDEX `BacklogTags_id_key`(`id`),
    INDEX `BacklogTags_backlogId_idx`(`backlogId`),
    INDEX `BacklogTags_tagId_idx`(`tagId`),
    INDEX `BacklogTags_todoId_idx`(`todoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BacklogTagTitles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BacklogTagTitles_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityModelHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `author` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `CommunityModelHistory_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityModelTemplateValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `value` DOUBLE NULL DEFAULT 1,
    `uid` VARCHAR(191) NOT NULL,
    `communityModelId` INTEGER NOT NULL,
    `inventoryCategoryId` INTEGER NULL,
    `inputConfigId` INTEGER NOT NULL,
    `inventoryId` INTEGER NULL,
    `communityModelHistoryId` INTEGER NULL,

    UNIQUE INDEX `CommunityModelTemplateValue_id_key`(`id`),
    INDEX `CommunityModelTemplateValue_communityModelId_idx`(`communityModelId`),
    INDEX `CommunityModelTemplateValue_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `CommunityModelTemplateValue_inventoryId_idx`(`inventoryId`),
    INDEX `CommunityModelTemplateValue_inputConfigId_idx`(`inputConfigId`),
    INDEX `CommunityModelTemplateValue_communityModelHistoryId_idx`(`communityModelHistoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityTemplateBlockConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `index` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `CommunityTemplateBlockConfig_id_key`(`id`),
    UNIQUE INDEX `CommunityTemplateBlockConfig_uid_key`(`uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityTemplateInputConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `valueUid` VARCHAR(191) NULL,
    `inputType` VARCHAR(191) NULL,
    `index` DOUBLE NOT NULL DEFAULT 0,
    `columnSize` DOUBLE NULL,
    `title` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `enableAnalytics` BOOLEAN NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `communityTemplateBlockConfigId` INTEGER NOT NULL,
    `attrId` INTEGER NULL,

    UNIQUE INDEX `CommunityTemplateInputConfig_id_key`(`id`),
    INDEX `CommunityTemplateInputConfig_communityTemplateBlockConfigId_idx`(`communityTemplateBlockConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityAnalyticAttributes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inputConfigId` INTEGER NULL,
    `attrInputId` INTEGER NULL,
    `communityTemplateInputConfigId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `CommunityAnalyticAttributes_id_key`(`id`),
    INDEX `CommunityAnalyticAttributes_inputConfigId_idx`(`inputConfigId`),
    INDEX `CommunityAnalyticAttributes_communityTemplateInputConfigId_idx`(`communityTemplateInputConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityHomeAnalytics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inputConfigId` INTEGER NULL,
    `homeId` INTEGER NULL,
    `templateValueId` INTEGER NULL,
    `blockConfigId` INTEGER NULL,

    UNIQUE INDEX `CommunityHomeAnalytics_id_key`(`id`),
    INDEX `CommunityHomeAnalytics_inputConfigId_idx`(`inputConfigId`),
    INDEX `CommunityHomeAnalytics_homeId_idx`(`homeId`),
    INDEX `CommunityHomeAnalytics_templateValueId_idx`(`templateValueId`),
    INDEX `CommunityHomeAnalytics_blockConfigId_idx`(`blockConfigId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `path` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `bucket` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Attachment_path_key`(`path`),
    UNIQUE INDEX `Attachment_path_deletedAt_key`(`path`, `deletedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `img` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `enablePricing` BOOLEAN NULL,
    `primary` BOOLEAN NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `discountId` VARCHAR(191) NULL,

    INDEX `InventoryCategory_discountId_idx`(`discountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubComponents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `required` BOOLEAN NULL DEFAULT false,
    `index` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'published',
    `inventoryCategoryId` INTEGER NOT NULL,
    `defaultInventoryId` INTEGER NULL,
    `parentId` INTEGER NULL,

    INDEX `SubComponents_parentId_idx`(`parentId`),
    INDEX `SubComponents_defaultInventoryId_idx`(`defaultInventoryId`),
    INDEX `SubComponents_inventoryCategoryId_idx`(`inventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `img` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `stockMode` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `primaryStoreFront` BOOLEAN NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryCategoryId` INTEGER NOT NULL,
    `discountId` VARCHAR(191) NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `featuredOrder` INTEGER NULL,
    `isTopProduct` BOOLEAN NOT NULL DEFAULT false,
    `topProductOrder` INTEGER NULL,
    `featuredStartDate` DATETIME(3) NULL,
    `featuredEndDate` DATETIME(3) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `orderCount` INTEGER NOT NULL DEFAULT 0,
    `salesAmount` DOUBLE NOT NULL DEFAULT 0,
    `averageRating` DOUBLE NULL,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `lastOrderedAt` DATETIME(3) NULL,

    INDEX `Inventory_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `Inventory_discountId_idx`(`discountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `img` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `lowStockAlert` INTEGER NULL,
    `status` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `inventoryId` INTEGER NOT NULL,

    INDEX `InventoryVariant_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariantAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryVariantId` INTEGER NULL,
    `inventoryCategoryVariantAttributeId` INTEGER NULL,
    `valueId` INTEGER NULL,

    INDEX `InventoryVariantAttribute_valueId_idx`(`valueId`),
    INDEX `InventoryVariantAttribute_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryVariantAttribute_inventoryCategoryVariantAttributeI_idx`(`inventoryCategoryVariantAttributeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryCategoryVariantAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryCategoryId` INTEGER NOT NULL,
    `valuesInventoryCategoryId` INTEGER NOT NULL,

    INDEX `InventoryCategoryVariantAttribute_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `InventoryCategoryVariantAttribute_valuesInventoryCategoryId_idx`(`valuesInventoryCategoryId`),
    UNIQUE INDEX `InventoryCategoryVariantAttribute_inventoryCategoryId_values_key`(`inventoryCategoryId`, `valuesInventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryVariantPricing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `price` DOUBLE NULL,
    `costPrice` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryVariantId` INTEGER NULL,
    `inventoryId` INTEGER NULL,

    UNIQUE INDEX `InventoryVariantPricing_inventoryVariantId_key`(`inventoryVariantId`),
    INDEX `InventoryVariantPricing_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryVariantPricing_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryVariantId` INTEGER NOT NULL,
    `oldPrice` DOUBLE NULL,
    `newPrice` DOUBLE NULL,
    `oldCostPrice` DOUBLE NULL,
    `newCostPrice` DOUBLE NULL,
    `currency` VARCHAR(191) NULL,
    `changeReason` VARCHAR(191) NULL,
    `changedBy` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `PriceHistory_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItemSubCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryId` INTEGER NOT NULL,
    `inventorySubCategoryId` INTEGER NULL,

    INDEX `InventoryItemSubCategory_inventoryId_idx`(`inventoryId`),
    INDEX `InventoryItemSubCategory_inventorySubCategoryId_idx`(`inventorySubCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItemSubCategoryValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operator` ENUM('is', 'isNot') NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `subCategoryId` INTEGER NOT NULL,
    `inventoryId` INTEGER NOT NULL,

    UNIQUE INDEX `InventoryItemSubCategoryValue_subCategoryId_key`(`subCategoryId`),
    INDEX `InventoryItemSubCategoryValue_subCategoryId_idx`(`subCategoryId`),
    INDEX `InventoryItemSubCategoryValue_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventorySubCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NOT NULL,
    `parentSubCategoryUid` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `parentInventoryCategoryId` INTEGER NOT NULL,

    INDEX `InventorySubCategory_parentInventoryCategoryId_idx`(`parentInventoryCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryVariantId` INTEGER NOT NULL,
    `qty` DOUBLE NOT NULL,
    `price` DOUBLE NULL,
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
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `qty` DOUBLE NOT NULL,
    `costPrice` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `inventoryId` INTEGER NULL,
    `inventoryStockId` INTEGER NULL,

    INDEX `InventoryLog_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryLog_inventoryId_idx`(`inventoryId`),
    INDEX `InventoryLog_inventoryStockId_idx`(`inventoryStockId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageGallery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `bucket` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ImageTags_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageGalleryTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `imageGalleryId` INTEGER NULL,
    `imageTagId` INTEGER NULL,

    INDEX `ImageGalleryTag_imageTagId_idx`(`imageTagId`),
    INDEX `ImageGalleryTag_imageGalleryId_idx`(`imageGalleryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `altText` VARCHAR(191) NULL,
    `position` INTEGER NULL,
    `primary` BOOLEAN NOT NULL DEFAULT false,
    `inventoryId` INTEGER NULL,
    `inventoryVariantId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `imageGalleryId` INTEGER NOT NULL,

    INDEX `InventoryImage_inventoryId_idx`(`inventoryId`),
    INDEX `InventoryImage_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `InventoryImage_imageGalleryId_idx`(`imageGalleryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryVariantId` INTEGER NOT NULL,
    `prevQty` DOUBLE NOT NULL,
    `currentQty` DOUBLE NOT NULL,
    `changeQty` DOUBLE NOT NULL,
    `type` ENUM('adjustment', 'stock_in', 'stock_out', 'sale', 'return', 'initial_stock') NOT NULL,
    `status` ENUM('pending', 'low_stock', 'completed') NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NULL,
    `inboundStockItemId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `StockMovement_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `StockMovement_inboundStockItemId_idx`(`inboundStockItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundShipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL,
    `expectedAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `reference` VARCHAR(191) NULL,
    `totalValue` DOUBLE NULL,
    `progress` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundShipment_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundShipmentItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inboundId` INTEGER NOT NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `qty` DOUBLE NOT NULL,
    `unitPrice` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundShipmentItem_inboundId_idx`(`inboundId`),
    INDEX `InboundShipmentItem_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WisthListItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guestId` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LineItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NULL,
    `sn` INTEGER NULL DEFAULT 0,
    `title` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `qty` DOUBLE NULL DEFAULT 1,
    `unitCost` DOUBLE NULL,
    `totalCost` DOUBLE NULL,
    `meta` JSON NULL,
    `guestId` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `lineItemType` ENUM('CART', 'WISHLIST', 'QUOTE', 'SALE') NOT NULL,
    `inventoryVariantId` INTEGER NOT NULL,
    `wisthListItemId` INTEGER NULL,
    `saleId` INTEGER NULL,
    `salesItemId` INTEGER NULL,
    `inventoryId` INTEGER NOT NULL,
    `inventoryCategoryId` INTEGER NOT NULL,

    UNIQUE INDEX `LineItem_salesItemId_key`(`salesItemId`),
    INDEX `LineItem_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `LineItem_wisthListItemId_idx`(`wisthListItemId`),
    INDEX `LineItem_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `LineItem_saleId_idx`(`saleId`),
    INDEX `LineItem_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LinePricing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `qty` INTEGER NULL,
    `costPrice` INTEGER NULL,
    `salesPrice` INTEGER NULL,
    `unitCostPrice` INTEGER NULL,
    `unitSalesPrice` INTEGER NULL,
    `componentId` INTEGER NULL,
    `lineItemId` INTEGER NULL,
    `inventoryVariantId` INTEGER NULL,
    `inventoryId` INTEGER NULL,

    UNIQUE INDEX `LinePricing_componentId_key`(`componentId`),
    UNIQUE INDEX `LinePricing_lineItemId_key`(`lineItemId`),
    INDEX `LinePricing_inventoryId_idx`(`inventoryId`),
    INDEX `LinePricing_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LineItemComponents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `lineItemId` INTEGER NOT NULL,
    `inventoryCategoryId` INTEGER NULL,
    `subComponentId` INTEGER NOT NULL,
    `inventoryId` INTEGER NULL,
    `inventoryVariantId` INTEGER NULL,
    `qty` INTEGER NULL,

    INDEX `LineItemComponents_lineItemId_idx`(`lineItemId`),
    INDEX `LineItemComponents_inventoryVariantId_idx`(`inventoryVariantId`),
    INDEX `LineItemComponents_inventoryId_idx`(`inventoryId`),
    INDEX `LineItemComponents_subComponentId_idx`(`subComponentId`),
    INDEX `LineItemComponents_inventoryCategoryId_idx`(`inventoryCategoryId`),
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

-- CreateTable
CREATE TABLE `Organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `primary` BOOLEAN NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Organization_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobPaymentAdjustments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` INTEGER NOT NULL,
    `type` ENUM('BONUS', 'EXPENSE', 'DEDUCTION') NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `jobPaymentsId` INTEGER NULL,

    UNIQUE INDEX `JobPaymentAdjustments_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SquarePaymentLink` (
    `id` VARCHAR(191) NOT NULL,
    `orderIdParams` VARCHAR(191) NULL,
    `phoneNo` VARCHAR(191) NULL,
    `option` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SquarePaymentLink_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesResolution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resolvedBy` VARCHAR(191) NOT NULL,
    `salesId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SalesResolution_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DispatchRegion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DispatchRegion_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesHistory` (
    `id` VARCHAR(191) NOT NULL,
    `data` JSON NULL,
    `name` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NULL,
    `salesId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SalesHistory_id_key`(`id`),
    INDEX `SalesHistory_salesId_idx`(`salesId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeProductsMetric` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `selectionCount` DOUBLE NULL,
    `qty` DOUBLE NULL,
    `salesPrice` DOUBLE NULL,
    `costPrice` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeProductsMetric_id_key`(`id`),
    UNIQUE INDEX `DykeProductsMetric_productId_key`(`productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SquareRefunds` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `refundId` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NOT NULL,
    `squarePaymentId` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SquareRefunds_paymentId_key`(`paymentId`),
    UNIQUE INDEX `SquareRefunds_refundId_key`(`refundId`),
    INDEX `SquareRefunds_squarePaymentId_idx`(`squarePaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

    INDEX `WeightBasedRate_weightBasedId_idx`(`weightBasedId`),
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

    INDEX `PriceBasedRate_priceBasedId_idx`(`priceBasedId`),
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

    INDEX `ShippingZone_zoneBasedId_idx`(`zoneBasedId`),
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

-- CreateTable
CREATE TABLE `EmailTokenLogin` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AddressBooks_regionId_idx` ON `AddressBooks`(`regionId`);

-- CreateIndex
CREATE INDEX `CommunityTemplateHistory_communityModelId_idx` ON `CommunityTemplateHistory`(`communityModelId`);

-- CreateIndex
CREATE INDEX `CommunityTemplateHistory_homeTemplateId_idx` ON `CommunityTemplateHistory`(`homeTemplateId`);

-- CreateIndex
CREATE UNIQUE INDEX `Customers_userId_key` ON `Customers`(`userId`);

-- CreateIndex
CREATE INDEX `ModelHasRoles_organizationId_idx` ON `ModelHasRoles`(`organizationId`);

-- CreateIndex
CREATE INDEX `Projects_orgId_idx` ON `Projects`(`orgId`);

-- CreateIndex
CREATE INDEX `SalesOrders_orgId_idx` ON `SalesOrders`(`orgId`);

-- CreateIndex
CREATE UNIQUE INDEX `Users_verificationToken_key` ON `Users`(`verificationToken`);

-- CreateIndex
CREATE INDEX `WorkOrders_orgId_idx` ON `WorkOrders`(`orgId`);
