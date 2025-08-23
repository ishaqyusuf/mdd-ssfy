-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryCategory` ADD COLUMN `meta` JSON NULL;

-- CreateTable
CREATE TABLE `SubComponents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `required` BOOLEAN NULL DEFAULT false,
    `index` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'published',
    `parentId` INTEGER NOT NULL,
    `inventoryCategoryId` INTEGER NOT NULL,
    `defaultInventoryId` INTEGER NULL,

    INDEX `SubComponents_defaultInventoryId_idx`(`defaultInventoryId`),
    INDEX `SubComponents_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `SubComponents_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
