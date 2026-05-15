-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `CustomerTypes` ADD COLUMN `dealerOwnerId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Customers` ADD COLUMN `dealerOwnerId` INTEGER NULL;

-- AlterTable
ALTER TABLE `DealerAuth` ADD COLUMN `companyName` VARCHAR(255) NULL,
    ADD COLUMN `meta` JSON NULL,
    ADD COLUMN `name` VARCHAR(255) NULL,
    ADD COLUMN `phoneNo` VARCHAR(255) NULL,
    MODIFY `dealerId` INTEGER NULL;

-- AlterTable
ALTER TABLE `SalesOrders` ADD COLUMN `dealerAuthId` INTEGER NULL,
    ADD COLUMN `dealerSalesProfileId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `CustomerTypes_dealerOwnerId_idx` ON `CustomerTypes`(`dealerOwnerId`);

-- CreateIndex
CREATE INDEX `Customers_dealerOwnerId_idx` ON `Customers`(`dealerOwnerId`);

-- CreateIndex
CREATE INDEX `SalesOrders_dealerAuthId_idx` ON `SalesOrders`(`dealerAuthId`);

-- CreateIndex
CREATE INDEX `SalesOrders_dealerSalesProfileId_idx` ON `SalesOrders`(`dealerSalesProfileId`);
