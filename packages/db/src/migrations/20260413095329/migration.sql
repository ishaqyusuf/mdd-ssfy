-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `InboundShipmentExtraction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inboundId` INTEGER NOT NULL,
    `storedDocumentId` VARCHAR(191) NULL,
    `status` ENUM('pending', 'processing', 'extracted', 'reviewed', 'failed') NOT NULL DEFAULT 'pending',
    `provider` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `supplierNameRaw` VARCHAR(255) NULL,
    `invoiceNumber` VARCHAR(255) NULL,
    `invoiceDate` DATETIME(3) NULL,
    `rawText` TEXT NULL,
    `structuredPayload` JSON NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` INTEGER NULL,
    `errorMessage` TEXT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundShipmentExtraction_inboundId_idx`(`inboundId`),
    INDEX `InboundShipmentExtraction_storedDocumentId_idx`(`storedDocumentId`),
    INDEX `InboundShipmentExtraction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundShipmentExtractionLine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `extractionId` INTEGER NOT NULL,
    `lineNo` INTEGER NULL,
    `rawDescription` TEXT NULL,
    `rawSku` VARCHAR(255) NULL,
    `qty` DOUBLE NULL,
    `unitPrice` DOUBLE NULL,
    `matchStatus` ENUM('unresolved', 'suggested', 'matched', 'ignored') NOT NULL DEFAULT 'unresolved',
    `inventoryCategoryId` INTEGER NULL,
    `inventoryId` INTEGER NULL,
    `inventoryVariantId` INTEGER NULL,
    `confidence` DOUBLE NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `InboundShipmentExtractionLine_extractionId_idx`(`extractionId`),
    INDEX `InboundShipmentExtractionLine_matchStatus_idx`(`matchStatus`),
    INDEX `InboundShipmentExtractionLine_inventoryCategoryId_idx`(`inventoryCategoryId`),
    INDEX `InboundShipmentExtractionLine_inventoryId_idx`(`inventoryId`),
    INDEX `InboundShipmentExtractionLine_inventoryVariantId_idx`(`inventoryVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
