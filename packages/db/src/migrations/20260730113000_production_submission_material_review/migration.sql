-- AlterTable
ALTER TABLE `OrderProductionSubmissions` ADD COLUMN `materialReviewId` INTEGER NULL;

-- CreateTable
CREATE TABLE `SalesProductionSubmissionMaterialReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NOT NULL,
    `submittedById` INTEGER NOT NULL,
    `reviewedById` INTEGER NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `classificationReason` ENUM('AWAITING_INBOUND', 'ALLOCATION_REVIEW', 'BLOCKED', 'NOT_CONFIGURED', 'PROJECTION_UNAVAILABLE') NULL,
    `idempotencyKey` VARCHAR(128) NOT NULL,
    `assignmentScope` JSON NOT NULL,
    `materialSnapshot` JSON NOT NULL,
    `materialRevision` VARCHAR(64) NULL,
    `resolution` JSON NULL,
    `decisionNote` TEXT NULL,
    `submittedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewedAt` TIMESTAMP(0) NULL,
    `cancelledAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesProductionSubmissionMaterialReview_idempotencyKey_key`(`idempotencyKey`),
    INDEX `SalesProductionSubmissionMaterialReview_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `SalesProductionSubmissionMaterialReview_salesOrderId_status_idx`(`salesOrderId`, `status`),
    INDEX `SalesProductionSubmissionMaterialReview_submittedById_status_idx`(`submittedById`, `status`),
    INDEX `SalesProductionSubmissionMaterialReview_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `OrderProductionSubmissions_materialReviewId_idx` ON `OrderProductionSubmissions`(`materialReviewId`);

-- CreateIndex
CREATE UNIQUE INDEX `OrderProductionSubmissions_materialReviewId_assignmentId_key` ON `OrderProductionSubmissions`(`materialReviewId`, `assignmentId`);
