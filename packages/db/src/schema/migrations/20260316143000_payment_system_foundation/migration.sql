CREATE TABLE `PaymentLedgerEntry` (
  `id` varchar(191) NOT NULL,
  `entryType` varchar(100) NOT NULL,
  `status` varchar(100) NOT NULL,
  `amount` double NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `idempotencyKey` varchar(191) DEFAULT NULL,
  `occurredAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `salesOrderId` int DEFAULT NULL,
  `walletId` int DEFAULT NULL,
  `customerTxId` int DEFAULT NULL,
  `salesPaymentId` int DEFAULT NULL,
  `squarePaymentId` varchar(191) DEFAULT NULL,
  `checkoutId` varchar(191) DEFAULT NULL,
  `refundId` varchar(191) DEFAULT NULL,
  `authorId` int DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PaymentLedgerEntry_idempotencyKey_key` (`idempotencyKey`),
  KEY `PaymentLedgerEntry_entryType_status_occurredAt_idx` (`entryType`, `status`, `occurredAt`),
  KEY `PaymentLedgerEntry_salesOrderId_occurredAt_idx` (`salesOrderId`, `occurredAt`),
  KEY `PaymentLedgerEntry_walletId_occurredAt_idx` (`walletId`, `occurredAt`),
  KEY `PaymentLedgerEntry_customerTxId_idx` (`customerTxId`),
  KEY `PaymentLedgerEntry_salesPaymentId_idx` (`salesPaymentId`),
  KEY `PaymentLedgerEntry_squarePaymentId_idx` (`squarePaymentId`),
  KEY `PaymentLedgerEntry_checkoutId_idx` (`checkoutId`),
  KEY `PaymentLedgerEntry_refundId_idx` (`refundId`),
  KEY `PaymentLedgerEntry_authorId_idx` (`authorId`)
);

CREATE TABLE `PaymentAllocation` (
  `id` varchar(191) NOT NULL,
  `ledgerEntryId` varchar(191) NOT NULL,
  `salesOrderId` int NOT NULL,
  `amount` double NOT NULL,
  `allocationType` varchar(100) NOT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `PaymentAllocation_ledgerEntryId_idx` (`ledgerEntryId`),
  KEY `PaymentAllocation_salesOrderId_idx` (`salesOrderId`),
  KEY `PaymentAllocation_allocationType_createdAt_idx` (`allocationType`, `createdAt`)
);

CREATE TABLE `PaymentProjection` (
  `salesOrderId` int NOT NULL,
  `totalRecorded` double NOT NULL DEFAULT 0,
  `totalAllocated` double NOT NULL DEFAULT 0,
  `totalRefunded` double NOT NULL DEFAULT 0,
  `totalVoided` double NOT NULL DEFAULT 0,
  `amountDue` double NOT NULL DEFAULT 0,
  `projectionState` varchar(50) NOT NULL DEFAULT 'active',
  `version` int NOT NULL DEFAULT 0,
  `lastSyncedAt` datetime DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`salesOrderId`),
  KEY `PaymentProjection_projectionState_updatedAt_idx` (`projectionState`, `updatedAt`),
  KEY `PaymentProjection_lastSyncedAt_idx` (`lastSyncedAt`)
);

CREATE TABLE `ResolutionCase` (
  `id` varchar(191) NOT NULL,
  `scopeType` varchar(100) NOT NULL,
  `scopeId` varchar(191) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'open',
  `summary` longtext DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ResolutionCase_scopeType_scopeId_status_idx` (`scopeType`, `scopeId`, `status`),
  KEY `ResolutionCase_status_createdAt_idx` (`status`, `createdAt`)
);

CREATE TABLE `ResolutionFinding` (
  `id` varchar(191) NOT NULL,
  `resolutionCaseId` varchar(191) NOT NULL,
  `findingType` varchar(100) NOT NULL,
  `severity` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'open',
  `snapshot` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ResolutionFinding_resolutionCaseId_idx` (`resolutionCaseId`),
  KEY `ResolutionFinding_findingType_severity_status_idx` (`findingType`, `severity`, `status`)
);

CREATE TABLE `ResolutionAction` (
  `id` varchar(191) NOT NULL,
  `resolutionCaseId` varchar(191) NOT NULL,
  `actionType` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `actorId` int DEFAULT NULL,
  `beforeState` json DEFAULT NULL,
  `afterState` json DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ResolutionAction_resolutionCaseId_idx` (`resolutionCaseId`),
  KEY `ResolutionAction_actionType_status_createdAt_idx` (`actionType`, `status`, `createdAt`),
  KEY `ResolutionAction_actorId_idx` (`actorId`)
);

CREATE TABLE `ResolutionRun` (
  `id` varchar(191) NOT NULL,
  `runType` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `startedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `completedAt` datetime DEFAULT NULL,
  `summary` longtext DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ResolutionRun_runType_status_startedAt_idx` (`runType`, `status`, `startedAt`)
);
