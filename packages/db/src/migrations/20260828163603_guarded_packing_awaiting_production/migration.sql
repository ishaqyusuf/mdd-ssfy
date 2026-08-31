-- AlterTable
ALTER TABLE `SalesPackingReport` ADD COLUMN `salesItemControlUid` VARCHAR(191) NULL,
    MODIFY `orderProductionSubmissionId` INTEGER NULL,
    MODIFY `reason` ENUM('UPSTREAM_PRODUCTION_REVIEW', 'STALE_UPSTREAM_EVIDENCE', 'AWAITING_PRODUCTION_SUBMISSION') NOT NULL;

-- CreateIndex
CREATE INDEX `SalesPackingReport_salesItemControlUid_status_idx` ON `SalesPackingReport`(`salesItemControlUid`, `status`);
