ALTER TABLE `SalesDocumentSnapshot`
    ADD COLUMN `providerJobId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `sales_doc_provider_job_uq`
    ON `SalesDocumentSnapshot`(`providerJobId`);
