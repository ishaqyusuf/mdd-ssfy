-- AlterTable
ALTER TABLE `JobPaymentAdjustments` MODIFY `amount` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `JobPayments` MODIFY `amount` DECIMAL(12, 2) NOT NULL,
    MODIFY `charges` DECIMAL(12, 2) NULL,
    MODIFY `subTotal` DECIMAL(12, 2) NULL;
