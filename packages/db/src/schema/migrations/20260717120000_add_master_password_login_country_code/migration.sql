ALTER TABLE `MasterPasswordLoginAudit`
    ADD COLUMN `countryCode` VARCHAR(2) NULL AFTER `ipAddress`;
