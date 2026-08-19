-- Nullable by design: historical conflicting rows remain quarantined with no
-- key until reviewed. Every canonical or legacy write assigns this key, and a
-- soft delete clears it so historical revisions remain available.
ALTER TABLE `DykeSalesDoors`
    ADD COLUMN `activeIdentity` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `DykeSalesDoors_activeIdentity_key`
    ON `DykeSalesDoors`(`activeIdentity`);
