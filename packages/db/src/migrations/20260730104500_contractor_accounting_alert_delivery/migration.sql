-- AlterTable
ALTER TABLE `ContractorAccountingAlertEvent` ADD COLUMN `emailDeliveredAt` DATETIME(3) NULL,
    ADD COLUMN `emailDelivery` JSON NULL,
    ADD COLUMN `emailDeliveryAttemptedAt` DATETIME(3) NULL,
    ADD COLUMN `emailDeliveryError` TEXT NULL;
