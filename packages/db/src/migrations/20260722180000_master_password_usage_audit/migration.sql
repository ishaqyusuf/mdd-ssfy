-- AlterTable
ALTER TABLE `MasterPasswordLoginAudit` ADD COLUMN `requestId` VARCHAR(255) NULL,
    ADD COLUMN `resourceId` VARCHAR(255) NULL,
    ADD COLUMN `resourceType` VARCHAR(40) NULL,
    ADD COLUMN `usageType` ENUM('LOGIN', 'SALES_REP_TRANSFER') NOT NULL DEFAULT 'LOGIN';

-- CreateIndex
CREATE INDEX `MasterPasswordLoginAudit_usageType_loginAt_idx` ON `MasterPasswordLoginAudit`(`usageType`, `loginAt`);

-- CreateIndex
CREATE INDEX `MasterPasswordLoginAudit_resourceType_resourceId_idx` ON `MasterPasswordLoginAudit`(`resourceType`, `resourceId`);
