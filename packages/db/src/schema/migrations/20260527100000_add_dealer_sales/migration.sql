CREATE TABLE `DealerSales` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `salesOrderId` INTEGER NOT NULL,
  `dealerAuthId` INTEGER NOT NULL,
  `customerId` INTEGER NOT NULL,
  `dealerCustomerProfileId` INTEGER NOT NULL,
  `dealerSalesPercentage` DOUBLE NOT NULL,
  `grandTotal` DOUBLE NOT NULL,
  `dueAmount` DOUBLE NOT NULL,
  `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` DATETIME(3) NULL,

  UNIQUE INDEX `DealerSales_id_key`(`id`),
  UNIQUE INDEX `DealerSales_salesOrderId_key`(`salesOrderId`),
  INDEX `DealerSales_dealerAuthId_idx`(`dealerAuthId`),
  INDEX `DealerSales_customerId_idx`(`customerId`),
  INDEX `DealerSales_dealerCustomerProfileId_idx`(`dealerCustomerProfileId`)
);
