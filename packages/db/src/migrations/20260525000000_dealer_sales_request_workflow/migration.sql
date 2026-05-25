ALTER TABLE `DealerAuth`
  ADD COLUMN `salesRepId` INTEGER NULL;

CREATE INDEX `DealerAuth_salesRepId_idx` ON `DealerAuth`(`salesRepId`);
