-- Dealership foundation: separate dealer profile lifecycle from customer records.
ALTER TABLE `DealerAuth`
  MODIFY `dealerId` INTEGER NULL,
  ADD COLUMN `name` VARCHAR(255) NULL,
  ADD COLUMN `companyName` VARCHAR(255) NULL,
  ADD COLUMN `phoneNo` VARCHAR(255) NULL,
  ADD COLUMN `meta` JSON NULL;

ALTER TABLE `Customers`
  ADD COLUMN `dealerOwnerId` INTEGER NULL;

CREATE INDEX `Customers_dealerOwnerId_idx` ON `Customers`(`dealerOwnerId`);

ALTER TABLE `CustomerTypes`
  ADD COLUMN `dealerOwnerId` INTEGER NULL;

CREATE INDEX `CustomerTypes_dealerOwnerId_idx` ON `CustomerTypes`(`dealerOwnerId`);

ALTER TABLE `SalesOrders`
  ADD COLUMN `dealerAuthId` INTEGER NULL,
  ADD COLUMN `dealerSalesProfileId` INTEGER NULL;

CREATE INDEX `SalesOrders_dealerAuthId_idx` ON `SalesOrders`(`dealerAuthId`);
CREATE INDEX `SalesOrders_dealerSalesProfileId_idx` ON `SalesOrders`(`dealerSalesProfileId`);
