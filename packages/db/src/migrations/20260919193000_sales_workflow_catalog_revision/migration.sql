-- AlterTable
ALTER TABLE `WebAuthVerification` MODIFY `value` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `SalesWorkflowCatalogRevision` (
    `scope` VARCHAR(191) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`scope`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
