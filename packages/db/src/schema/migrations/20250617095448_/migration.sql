-- CreateTable
CREATE TABLE `GitTasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Todos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gitTasksId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Todos_id_key`(`id`),
    INDEX `Todos_gitTasksId_idx`(`gitTasksId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GitStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `taskId` INTEGER NULL,
    `todosId` INTEGER NULL,

    UNIQUE INDEX `GitStatus_id_key`(`id`),
    INDEX `GitStatus_taskId_idx`(`taskId`),
    INDEX `GitStatus_todosId_idx`(`todosId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GitTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tagId` INTEGER NOT NULL,
    `gitTaskId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `todoId` INTEGER NULL,

    UNIQUE INDEX `GitTags_id_key`(`id`),
    INDEX `GitTags_gitTaskId_idx`(`gitTaskId`),
    INDEX `GitTags_tagId_idx`(`tagId`),
    INDEX `GitTags_todoId_idx`(`todoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Tags_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinPaymentInvoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `totalDuration` DOUBLE NULL,
    `totalAmount` DOUBLE NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinPayments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',
    `invoiceId` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `clockinPayoutId` INTEGER NULL,

    INDEX `ClockinPayments_invoiceId_idx`(`invoiceId`),
    INDEX `ClockinPayments_clockinPayoutId_idx`(`clockinPayoutId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinPayout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NULL,
    `exchangeRate` DOUBLE NULL,
    `amountInUSD` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clockIn` TIMESTAMP(0) NOT NULL,
    `clockOut` TIMESTAMP(0) NULL,
    `duration` DOUBLE NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `invoiceId` INTEGER NULL,

    UNIQUE INDEX `ClockinSession_invoiceId_key`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClockinBreak` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clockIn` TIMESTAMP(0) NOT NULL,
    `clockOut` TIMESTAMP(0) NULL,
    `duration` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `clockinId` INTEGER NULL,

    INDEX `ClockinBreak_clockinId_idx`(`clockinId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `archived` BOOLEAN NULL,
    `title` VARCHAR(255) NULL,
    `builderId` INTEGER NULL,
    `address` VARCHAR(255) NULL,
    `slug` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `refNo` VARCHAR(255) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Projects_id_key`(`id`),
    UNIQUE INDEX `Projects_slug_key`(`slug`),
    INDEX `Projects_builderId_idx`(`builderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Homes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `archived` BOOLEAN NULL,
    `projectId` INTEGER NOT NULL,
    `builderId` INTEGER NULL,
    `homeTemplateId` INTEGER NULL,
    `communityTemplateId` INTEGER NULL,
    `homeKey` VARCHAR(255) NULL,
    `slug` VARCHAR(255) NULL,
    `modelName` VARCHAR(255) NULL,
    `modelNo` VARCHAR(255) NULL,
    `lotBlock` VARCHAR(255) NULL,
    `lot` VARCHAR(255) NULL,
    `block` VARCHAR(255) NULL,
    `status` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `sentToProdAt` TIMESTAMP(0) NULL,
    `installedAt` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `search` VARCHAR(255) NULL,
    `punchoutAt` TIMESTAMP(0) NULL,
    `installCost` DOUBLE NULL,
    `punchoutCost` DOUBLE NULL,

    UNIQUE INDEX `Homes_id_key`(`id`),
    UNIQUE INDEX `Homes_slug_key`(`slug`),
    INDEX `Homes_createdAt_deletedAt_modelName_search_projectId_idx`(`createdAt`, `deletedAt`, `modelName`, `search`, `projectId`),
    INDEX `Homes_projectId_idx`(`projectId`),
    INDEX `Homes_homeTemplateId_idx`(`homeTemplateId`),
    INDEX `Homes_communityTemplateId_idx`(`communityTemplateId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeTasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `archived` BOOLEAN NULL,
    `homeId` INTEGER NULL,
    `type` VARCHAR(255) NULL,
    `taskName` VARCHAR(255) NULL,
    `taskUid` VARCHAR(255) NULL,
    `status` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `producerName` VARCHAR(255) NULL,
    `search` VARCHAR(255) NULL,
    `productionStatus` VARCHAR(255) NULL,
    `checkNo` VARCHAR(255) NULL,
    `projectId` INTEGER NULL,
    `assignedToId` INTEGER NULL,
    `billable` BOOLEAN NULL,
    `produceable` BOOLEAN NULL,
    `installable` BOOLEAN NULL,
    `punchout` BOOLEAN NULL,
    `deco` BOOLEAN NULL,
    `addon` BOOLEAN NULL,
    `taxCost` DOUBLE NULL,
    `amountDue` DOUBLE NULL,
    `amountPaid` DOUBLE NULL,
    `completedAt` DATETIME(3) NULL,
    `jobId` INTEGER NULL,
    `checkDate` TIMESTAMP(0) NULL,
    `statusDate` TIMESTAMP(0) NULL,
    `sentToProductionAt` TIMESTAMP(0) NULL,
    `producedAt` TIMESTAMP(0) NULL,
    `prodStartedAt` TIMESTAMP(0) NULL,
    `productionStatusDate` TIMESTAMP(0) NULL,
    `productionDueDate` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `HomeTasks_id_key`(`id`),
    INDEX `HomeTasks_createdAt_deletedAt_produceable_billable_addon_dec_idx`(`createdAt`, `deletedAt`, `produceable`, `billable`, `addon`, `deco`, `punchout`, `installable`, `taskName`, `projectId`, `jobId`),
    INDEX `HomeTasks_homeId_idx`(`homeId`),
    INDEX `HomeTasks_projectId_idx`(`projectId`),
    INDEX `HomeTasks_jobId_idx`(`jobId`),
    INDEX `HomeTasks_assignedToId_idx`(`assignedToId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeTemplates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `builderId` INTEGER NULL,
    `slug` VARCHAR(255) NOT NULL,
    `modelNo` VARCHAR(255) NULL,
    `modelName` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `HomeTemplates_id_key`(`id`),
    UNIQUE INDEX `HomeTemplates_slug_key`(`slug`),
    INDEX `HomeTemplates_builderId_idx`(`builderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NULL,
    `homeId` INTEGER NULL,
    `refNo` VARCHAR(255) NULL,
    `lot` VARCHAR(255) NULL,
    `block` VARCHAR(255) NULL,
    `taskId` INTEGER NULL,
    `checkNo` VARCHAR(255) NULL,
    `amount` DOUBLE NULL,
    `taskName` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `taskUid` VARCHAR(255) NULL,
    `checkDate` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Invoices_id_key`(`id`),
    INDEX `Invoices_projectId_idx`(`projectId`),
    INDEX `Invoices_homeId_idx`(`homeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityModelPivot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `model` VARCHAR(255) NOT NULL,
    `projectId` INTEGER NOT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `CommunityModelPivot_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityModelCost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communityModelId` INTEGER NULL,
    `pivotId` INTEGER NULL,
    `current` BOOLEAN NULL,
    `title` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `model` VARCHAR(255) NOT NULL,
    `meta` JSON NULL,
    `startDate` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `endDate` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `CommunityModelCost_id_key`(`id`),
    INDEX `CommunityModelCost_communityModelId_idx`(`communityModelId`),
    INDEX `CommunityModelCost_pivotId_idx`(`pivotId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Builders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `slug` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Builders_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CostCharts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentId` INTEGER NULL,
    `current` BOOLEAN NULL,
    `title` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `model` VARCHAR(255) NOT NULL,
    `meta` JSON NULL,
    `startDate` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `endDate` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CostCharts_id_key`(`id`),
    INDEX `CostCharts_parentId_idx`(`parentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityModels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `pivotId` INTEGER NULL,
    `modelName` VARCHAR(255) NOT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `slug` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `CommunityModels_id_key`(`id`),
    UNIQUE INDEX `CommunityModels_slug_key`(`slug`),
    INDEX `CommunityModels_pivotId_idx`(`pivotId`),
    INDEX `CommunityModels_projectId_idx`(`projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityTemplateHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `communityModelsId` INTEGER NULL,

    UNIQUE INDEX `CommunityTemplateHistory_id_key`(`id`),
    INDEX `CommunityTemplateHistory_userId_idx`(`userId`),
    INDEX `CommunityTemplateHistory_communityModelsId_idx`(`communityModelsId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MailGrids` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NULL,
    `html` TEXT NULL,
    `message` TEXT NULL,
    `design` LONGTEXT NULL,
    `fromName` VARCHAR(255) NULL,
    `fromEmail` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `status` VARCHAR(255) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `slug` VARCHAR(255) NULL,
    `type` VARCHAR(255) NULL,

    UNIQUE INDEX `MailGrids_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MailEventTrigger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `when` VARCHAR(191) NOT NULL,
    `mailGridId` INTEGER NULL,
    `authorId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `MailEventTrigger_id_key`(`id`),
    INDEX `MailEventTrigger_mailGridId_idx`(`mailGridId`),
    INDEX `MailEventTrigger_authorId_idx`(`authorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inbox` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientId` INTEGER NULL,
    `senderId` INTEGER NOT NULL,
    `parentId` INTEGER NULL,
    `subject` TEXT NULL,
    `from` TEXT NOT NULL,
    `to` TEXT NOT NULL,
    `type` TEXT NOT NULL,
    `body` TEXT NOT NULL,
    `meta` JSON NULL,
    `sentAt` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Inbox_id_key`(`id`),
    INDEX `Inbox_senderId_idx`(`senderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboxAttachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `inboxId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `InboxAttachments_id_key`(`id`),
    INDEX `InboxAttachments_inboxId_idx`(`inboxId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotePad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `note` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `headline` VARCHAR(191) NULL,
    `createdById` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `senderContactId` INTEGER NOT NULL,

    UNIQUE INDEX `NotePad_id_key`(`id`),
    INDEX `NotePad_senderContactId_idx`(`senderContactId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteRecipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `notePadId` INTEGER NOT NULL,
    `notePadContactId` INTEGER NOT NULL,

    UNIQUE INDEX `NoteRecipients_id_key`(`id`),
    INDEX `NoteRecipients_notePadId_idx`(`notePadId`),
    INDEX `NoteRecipients_notePadContactId_idx`(`notePadContactId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotePadContacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phoneNo` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `NotePadContacts_id_key`(`id`),
    UNIQUE INDEX `NotePadContacts_name_email_phoneNo_key`(`name`, `email`, `phoneNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tagName` VARCHAR(191) NOT NULL,
    `tagValue` VARCHAR(191) NOT NULL,
    `notePadId` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `NoteTags_id_key`(`id`),
    INDEX `NoteTags_notePadId_idx`(`notePadId`),
    UNIQUE INDEX `NoteTags_tagName_tagValue_notePadId_key`(`tagName`, `tagValue`, `notePadId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteComments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notePadId` INTEGER NULL,
    `commentNotePadId` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `NoteComments_id_key`(`id`),
    INDEX `NoteComments_notePadId_idx`(`notePadId`),
    INDEX `NoteComments_commentNotePadId_idx`(`commentNotePadId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotePadEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reminderType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `reminderDate` TIMESTAMP(0) NULL,
    `remindedAt` TIMESTAMP(0) NULL,
    `eventDate` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `notePadId` INTEGER NOT NULL,

    UNIQUE INDEX `NotePadEvent_id_key`(`id`),
    INDEX `NotePadEvent_notePadId_idx`(`notePadId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotePadReadReceipt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `notePadContactId` INTEGER NOT NULL,
    `notePadId` INTEGER NOT NULL,

    UNIQUE INDEX `NotePadReadReceipt_id_key`(`id`),
    INDEX `NotePadReadReceipt_notePadContactId_idx`(`notePadContactId`),
    INDEX `NotePadReadReceipt_notePadId_idx`(`notePadId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'PAID') NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `payrollId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `PayrollHistory_id_key`(`id`),
    INDEX `PayrollHistory_userId_idx`(`userId`),
    INDEX `PayrollHistory_payrollId_idx`(`payrollId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payroll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `type` ENUM('COMMISSION', 'WAGE') NOT NULL,
    `headline` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL,
    `itemUid` VARCHAR(191) NULL,
    `orderId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `userId` INTEGER NOT NULL,
    `payoutId` INTEGER NULL,
    `productionSubmissionId` INTEGER NULL,
    `orderPaymentId` INTEGER NULL,

    UNIQUE INDEX `Payroll_id_key`(`id`),
    UNIQUE INDEX `Payroll_productionSubmissionId_key`(`productionSubmissionId`),
    UNIQUE INDEX `Payroll_orderPaymentId_key`(`orderPaymentId`),
    INDEX `Payroll_productionSubmissionId_idx`(`productionSubmissionId`),
    INDEX `Payroll_orderId_idx`(`orderId`),
    INDEX `Payroll_userId_idx`(`userId`),
    INDEX `Payroll_payoutId_idx`(`payoutId`),
    INDEX `Payroll_itemUid_idx`(`itemUid`),
    UNIQUE INDEX `Payroll_uid_deletedAt_key`(`uid`, `deletedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesPayout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(191) NOT NULL,
    `payoutDate` DATETIME(3) NULL,
    `method` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `payerId` INTEGER NOT NULL,
    `payeeId` INTEGER NOT NULL,

    UNIQUE INDEX `SalesPayout_reference_key`(`reference`),
    INDEX `SalesPayout_payeeId_idx`(`payeeId`),
    INDEX `SalesPayout_payerId_idx`(`payerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `coWorkerId` INTEGER NULL,
    `type` VARCHAR(255) NOT NULL,
    `homeId` INTEGER NULL,
    `projectId` INTEGER NULL,
    `amount` DOUBLE NOT NULL,
    `title` VARCHAR(255) NULL,
    `subtitle` VARCHAR(255) NULL,
    `description` LONGTEXT NULL,
    `note` TEXT NULL,
    `status` VARCHAR(255) NOT NULL,
    `meta` JSON NULL,
    `adminNote` TEXT NULL,
    `statusDate` TIMESTAMP(0) NULL,
    `rejectedAt` TIMESTAMP(0) NULL,
    `approvedAt` TIMESTAMP(0) NULL,
    `approvedBy` INTEGER NULL,
    `paymentId` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Jobs_id_key`(`id`),
    INDEX `Jobs_createdAt_homeId_type_status_userId_idx`(`createdAt`, `homeId`, `type`, `status`, `userId`),
    INDEX `Jobs_paymentId_idx`(`paymentId`),
    INDEX `Jobs_homeId_idx`(`homeId`),
    INDEX `Jobs_userId_idx`(`userId`),
    INDEX `Jobs_coWorkerId_idx`(`coWorkerId`),
    INDEX `Jobs_projectId_idx`(`projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobPayments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` INTEGER NOT NULL,
    `charges` INTEGER NULL,
    `subTotal` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `paidBy` INTEGER NOT NULL,
    `checkNo` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `JobPayments_id_key`(`id`),
    INDEX `JobPayments_userId_idx`(`userId`),
    INDEX `JobPayments_paidBy_idx`(`paidBy`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesResolution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resolvedBy` VARCHAR(191) NOT NULL,
    `salesId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SalesResolution_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `addressId` INTEGER NULL,
    `customerTypeId` INTEGER NULL,
    `slug` VARCHAR(255) NULL,
    `walletId` INTEGER NULL,
    `name` VARCHAR(255) NULL,
    `businessName` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `phoneNo` VARCHAR(255) NULL,
    `phoneNo2` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Customers_id_key`(`id`),
    UNIQUE INDEX `Customers_slug_key`(`slug`),
    UNIQUE INDEX `Customers_walletId_key`(`walletId`),
    UNIQUE INDEX `Customers_phoneNo_key`(`phoneNo`),
    INDEX `Customers_createdAt_deletedAt_name_email_phoneNo_idx`(`createdAt`, `deletedAt`, `name`, `email`, `phoneNo`),
    INDEX `Customers_customerTypeId_idx`(`customerTypeId`),
    INDEX `Customers_phoneNo_idx`(`phoneNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerTaxProfiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `taxCode` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CustomerTaxProfiles_id_key`(`id`),
    INDEX `CustomerTaxProfiles_customerId_idx`(`customerId`),
    UNIQUE INDEX `CustomerTaxProfiles_taxCode_customerId_deletedAt_key`(`taxCode`, `customerId`, `deletedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerAuth` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dealerId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(255) NULL,
    `emailVerifiedAt` TIMESTAMP(0) NULL,
    `approvedAt` TIMESTAMP(0) NULL,
    `rejectedAt` TIMESTAMP(0) NULL,
    `restricted` BOOLEAN NULL,
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `status` VARCHAR(191) NULL,
    `primaryBillingAddressId` INTEGER NULL,
    `primaryShippingAddressId` INTEGER NULL,

    UNIQUE INDEX `DealerAuth_id_key`(`id`),
    UNIQUE INDEX `DealerAuth_dealerId_key`(`dealerId`),
    UNIQUE INDEX `DealerAuth_email_key`(`email`),
    INDEX `DealerAuth_primaryBillingAddressId_idx`(`primaryBillingAddressId`),
    INDEX `DealerAuth_primaryShippingAddressId_idx`(`primaryShippingAddressId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerStatusHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dealerId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `authorId` INTEGER NOT NULL,
    `reason` LONGTEXT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DealerStatusHistory_id_key`(`id`),
    INDEX `DealerStatusHistory_dealerId_idx`(`dealerId`),
    INDEX `DealerStatusHistory_authorId_idx`(`authorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerToken` (
    `dealerId` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiredAt` TIMESTAMP(0) NULL,
    `consumedAt` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DealerToken_token_key`(`token`),
    INDEX `DealerToken_dealerId_idx`(`dealerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerTypes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `coefficient` DOUBLE NULL,
    `defaultProfile` BOOLEAN NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CustomerTypes_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerSalesRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `salesId` INTEGER NOT NULL,
    `request` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `approvedById` INTEGER NULL,

    UNIQUE INDEX `DealerSalesRequest_id_key`(`id`),
    INDEX `DealerSalesRequest_salesId_idx`(`salesId`),
    INDEX `DealerSalesRequest_approvedById_idx`(`approvedById`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderDelivery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NOT NULL,
    `deliveredTo` VARCHAR(191) NULL,
    `deliveryMode` VARCHAR(191) NOT NULL,
    `driverId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `status` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `OrderDelivery_id_key`(`id`),
    INDEX `OrderDelivery_salesOrderId_idx`(`salesOrderId`),
    INDEX `OrderDelivery_driverId_idx`(`driverId`),
    INDEX `OrderDelivery_createdById_idx`(`createdById`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItemDelivery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderItemId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `lhQty` INTEGER NULL DEFAULT 0,
    `rhQty` INTEGER NULL DEFAULT 0,
    `qty` INTEGER NOT NULL DEFAULT 0,
    `meta` JSON NULL,
    `status` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `orderDeliveryId` INTEGER NULL,
    `orderProductionSubmissionId` INTEGER NULL,

    UNIQUE INDEX `OrderItemDelivery_id_key`(`id`),
    INDEX `OrderItemDelivery_orderProductionSubmissionId_idx`(`orderProductionSubmissionId`),
    INDEX `OrderItemDelivery_orderId_idx`(`orderId`),
    INDEX `OrderItemDelivery_orderItemId_idx`(`orderItemId`),
    INDEX `OrderItemDelivery_orderDeliveryId_idx`(`orderDeliveryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesPickup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pickupBy` VARCHAR(191) NULL,
    `pickupApprovedBy` INTEGER NOT NULL,
    `meta` JSON NULL,
    `pickupAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SalesPickup_id_key`(`id`),
    INDEX `SalesPickup_pickupApprovedBy_idx`(`pickupApprovedBy`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommissionPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `userId` INTEGER NOT NULL,
    `paidBy` INTEGER NOT NULL,
    `checkNo` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `usersId` INTEGER NULL,

    UNIQUE INDEX `CommissionPayment_id_key`(`id`),
    INDEX `CommissionPayment_userId_idx`(`userId`),
    INDEX `CommissionPayment_paidBy_idx`(`paidBy`),
    INDEX `CommissionPayment_usersId_idx`(`usersId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NULL,
    `customerId` INTEGER NULL,
    `billingAddressId` INTEGER NULL,
    `shippingAddressId` INTEGER NULL,
    `salesRepId` INTEGER NULL,
    `pickupId` INTEGER NULL,
    `prodId` INTEGER NULL,
    `isDyke` BOOLEAN NULL DEFAULT false,
    `summary` TEXT NULL,
    `instruction` TEXT NULL,
    `meta` JSON NULL,
    `status` VARCHAR(255) NULL,
    `inventoryStatus` VARCHAR(255) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `orderId` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NULL,
    `goodUntil` DATETIME(3) NULL,
    `priority` ENUM('CRITICAL', 'HIGH', 'NORMAL', 'LOW') NULL DEFAULT 'NORMAL',
    `paymentTerm` VARCHAR(191) NULL,
    `prodQty` DOUBLE NULL,
    `builtQty` DOUBLE NULL,
    `subTotal` DOUBLE NULL,
    `profitMargin` DOUBLE NULL,
    `tax` DOUBLE NULL,
    `taxPercentage` DOUBLE NULL,
    `grandTotal` DOUBLE NULL,
    `amountDue` DOUBLE NULL,
    `invoiceStatus` VARCHAR(255) NULL,
    `prodStatus` VARCHAR(255) NULL,
    `prodDueDate` TIMESTAMP(0) NULL,
    `paymentDueDate` TIMESTAMP(0) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `deliveryOption` VARCHAR(191) NULL,
    `customerProfileId` INTEGER NULL,

    UNIQUE INDEX `SalesOrders_id_key`(`id`),
    INDEX `SalesOrders_createdAt_deletedAt_orderId_grandTotal_prodId_ty_idx`(`createdAt`, `deletedAt`, `orderId`, `grandTotal`, `prodId`, `type`, `prodDueDate`),
    INDEX `SalesOrders_customerProfileId_idx`(`customerProfileId`),
    INDEX `SalesOrders_customerId_idx`(`customerId`),
    INDEX `SalesOrders_shippingAddressId_idx`(`shippingAddressId`),
    INDEX `SalesOrders_billingAddressId_idx`(`billingAddressId`),
    INDEX `SalesOrders_prodId_idx`(`prodId`),
    INDEX `SalesOrders_salesRepId_idx`(`salesRepId`),
    INDEX `SalesOrders_pickupId_idx`(`pickupId`),
    UNIQUE INDEX `SalesOrders_orderId_type_key`(`orderId`, `type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesExtraCosts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `type` ENUM('Discount', 'DiscountPercentage', 'Labor', 'CustomTaxxable', 'CustomNonTaxxable', 'Delivery', 'EXT') NOT NULL,
    `taxxable` BOOLEAN NULL,
    `amount` DOUBLE NOT NULL,
    `tax` DOUBLE NULL,
    `totalAmount` DOUBLE NULL,
    `percentage` DOUBLE NULL,
    `orderId` INTEGER NOT NULL,

    UNIQUE INDEX `SalesExtraCosts_id_key`(`id`),
    INDEX `SalesExtraCosts_orderId_idx`(`orderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrderItems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(300) NULL,
    `dykeDescription` VARCHAR(300) NULL,
    `productId` INTEGER NULL,
    `supplier` VARCHAR(191) NULL,
    `swing` VARCHAR(255) NULL,
    `price` DOUBLE NULL,
    `tax` DOUBLE NULL,
    `taxPercenatage` DOUBLE NULL,
    `discount` DOUBLE NULL,
    `discountPercentage` DOUBLE NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `qty` DOUBLE NULL,
    `prebuiltQty` DOUBLE NULL,
    `truckLoadQty` DOUBLE NULL,
    `salesOrderId` INTEGER NOT NULL,
    `profitMargin` DOUBLE NULL,
    `rate` DOUBLE NULL,
    `total` DOUBLE NULL,
    `salesPercentage` DOUBLE NULL,
    `prodStatus` VARCHAR(255) NULL,
    `prodStartedAt` TIMESTAMP(0) NULL,
    `sentToProdAt` TIMESTAMP(0) NULL,
    `prodCompletedAt` TIMESTAMP(0) NULL,
    `multiDyke` BOOLEAN NOT NULL DEFAULT false,
    `dykeProduction` BOOLEAN NOT NULL DEFAULT false,
    `multiDykeUid` VARCHAR(191) NULL,

    UNIQUE INDEX `SalesOrderItems_id_key`(`id`),
    INDEX `SalesOrderItems_createdAt_description_swing_idx`(`createdAt`, `description`, `swing`),
    INDEX `idx_SalesOrderItems_on_salesOrderId`(`salesOrderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QtyControl` (
    `itemControlUid` VARCHAR(191) NOT NULL,
    `qty` INTEGER NULL DEFAULT 0,
    `lh` INTEGER NULL DEFAULT 0,
    `rh` INTEGER NULL DEFAULT 0,
    `total` INTEGER NOT NULL DEFAULT 0,
    `itemTotal` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `percentage` DOUBLE NULL,
    `autoComplete` BOOLEAN NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `QtyControl_itemControlUid_type_key`(`itemControlUid`, `type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesItemControl` (
    `uid` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `subtitle` VARCHAR(191) NULL,
    `sectionTitle` VARCHAR(191) NULL,
    `salesId` INTEGER NOT NULL,
    `produceable` BOOLEAN NULL,
    `shippable` BOOLEAN NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `orderItemId` INTEGER NULL,

    UNIQUE INDEX `SalesItemControl_uid_key`(`uid`),
    INDEX `SalesItemControl_salesId_idx`(`salesId`),
    INDEX `SalesItemControl_orderItemId_idx`(`orderItemId`),
    INDEX `SalesItemControl_uid_idx`(`uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HousePackageTools` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderItemId` INTEGER NOT NULL,
    `priceId` VARCHAR(191) NULL,
    `height` VARCHAR(191) NULL,
    `doorType` VARCHAR(191) NULL,
    `doorId` INTEGER NULL,
    `dykeDoorId` INTEGER NULL,
    `jambSizeId` INTEGER NULL,
    `casingId` INTEGER NULL,
    `moldingId` INTEGER NULL,
    `stepProductId` INTEGER NULL,
    `totalPrice` DOUBLE NULL DEFAULT 0,
    `totalDoors` INTEGER NULL DEFAULT 0,
    `meta` JSON NULL,
    `salesOrderId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `HousePackageTools_id_key`(`id`),
    UNIQUE INDEX `HousePackageTools_orderItemId_key`(`orderItemId`),
    UNIQUE INDEX `HousePackageTools_priceId_key`(`priceId`),
    INDEX `HousePackageTools_stepProductId_idx`(`stepProductId`),
    INDEX `HousePackageTools_salesOrderId_idx`(`salesOrderId`),
    INDEX `HousePackageTools_dykeDoorId_idx`(`dykeDoorId`),
    INDEX `HousePackageTools_doorId_idx`(`doorId`),
    INDEX `HousePackageTools_jambSizeId_idx`(`jambSizeId`),
    INDEX `HousePackageTools_casingId_idx`(`casingId`),
    INDEX `HousePackageTools_moldingId_idx`(`moldingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComponentPrice` (
    `id` VARCHAR(191) NOT NULL,
    `salesItemId` INTEGER NOT NULL,
    `salesId` INTEGER NOT NULL,
    `qty` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `baseUnitCost` DOUBLE NOT NULL,
    `baseTotalCost` DOUBLE NOT NULL,
    `salesUnitCost` DOUBLE NOT NULL,
    `salesTotalCost` DOUBLE NOT NULL,
    `margin` DOUBLE NOT NULL DEFAULT 1,
    `salesProfit` DOUBLE NOT NULL,
    `taxPercentage` DOUBLE NULL,
    `totalTax` DOUBLE NULL,
    `grandTotal` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ComponentPrice_id_key`(`id`),
    INDEX `ComponentPrice_salesId_idx`(`salesId`),
    INDEX `ComponentPrice_salesItemId_idx`(`salesItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeSalesDoors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `priceId` VARCHAR(191) NULL,
    `dimension` VARCHAR(191) NOT NULL,
    `swing` VARCHAR(191) NULL,
    `doorType` VARCHAR(191) NULL,
    `housePackageToolId` INTEGER NOT NULL,
    `doorPrice` DOUBLE NULL,
    `jambSizePrice` DOUBLE NULL,
    `casingPrice` DOUBLE NULL,
    `unitPrice` DOUBLE NULL,
    `lhQty` INTEGER NULL DEFAULT 0,
    `rhQty` INTEGER NULL DEFAULT 0,
    `totalQty` INTEGER NOT NULL DEFAULT 0,
    `salesOrderId` INTEGER NOT NULL,
    `lineTotal` DOUBLE NULL DEFAULT 0,
    `salesOrderItemId` INTEGER NULL,
    `stepProductId` INTEGER NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeSalesDoors_id_key`(`id`),
    UNIQUE INDEX `DykeSalesDoors_priceId_key`(`priceId`),
    INDEX `DykeSalesDoors_housePackageToolId_idx`(`housePackageToolId`),
    INDEX `DykeSalesDoors_salesOrderItemId_idx`(`salesOrderItemId`),
    INDEX `DykeSalesDoors_salesOrderId_idx`(`salesOrderId`),
    INDEX `DykeSalesDoors_stepProductId_idx`(`stepProductId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeStepForm` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `componentId` INTEGER NULL,
    `value` VARCHAR(191) NULL,
    `priceId` VARCHAR(191) NULL,
    `qty` INTEGER NULL DEFAULT 0,
    `price` DOUBLE NULL DEFAULT 0,
    `basePrice` DOUBLE NULL DEFAULT 0,
    `prodUid` VARCHAR(191) NULL,
    `salesId` INTEGER NULL,
    `salesItemId` INTEGER NULL,
    `stepId` INTEGER NOT NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DykeStepForm_id_key`(`id`),
    UNIQUE INDEX `DykeStepForm_priceId_key`(`priceId`),
    INDEX `DykeStepForm_componentId_idx`(`componentId`),
    INDEX `DykeStepForm_salesId_idx`(`salesId`),
    INDEX `DykeStepForm_salesItemId_idx`(`salesItemId`),
    INDEX `DykeStepForm_stepId_idx`(`stepId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeSteps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `uid` VARCHAR(191) NULL,
    `value` TEXT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `stepValueId` INTEGER NULL,
    `rootStepValueId` INTEGER NULL,
    `prevStepValueId` INTEGER NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeSteps_id_key`(`id`),
    INDEX `DykeSteps_rootStepValueId_idx`(`rootStepValueId`),
    INDEX `DykeSteps_stepValueId_idx`(`stepValueId`),
    INDEX `DykeSteps_prevStepValueId_idx`(`prevStepValueId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeStepValues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeStepValues_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeCategories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeCategories_id_key`(`id`),
    UNIQUE INDEX `DykeCategories_title_key`(`title`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeStepProducts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NULL,
    `productCode` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `img` VARCHAR(191) NULL,
    `redirectUid` VARCHAR(191) NULL,
    `custom` BOOLEAN NULL DEFAULT false,
    `sortIndex` INTEGER NULL,
    `dykeProductId` INTEGER NULL,
    `doorId` INTEGER NULL,
    `dykeStepId` INTEGER NOT NULL,
    `nextStepId` INTEGER NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeStepProducts_id_key`(`id`),
    UNIQUE INDEX `DykeStepProducts_uid_key`(`uid`),
    INDEX `DykeStepProducts_doorId_idx`(`doorId`),
    INDEX `DykeStepProducts_dykeStepId_idx`(`dykeStepId`),
    INDEX `DykeStepProducts_dykeProductId_idx`(`dykeProductId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductSortIndex` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sortIndex` INTEGER NOT NULL,
    `uid` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `stepComponentId` INTEGER NOT NULL,

    UNIQUE INDEX `ProductSortIndex_id_key`(`id`),
    INDEX `ProductSortIndex_stepComponentId_idx`(`stepComponentId`),
    UNIQUE INDEX `ProductSortIndex_stepComponentId_uid_key`(`stepComponentId`, `uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykePricingSystem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dykeStepId` INTEGER NOT NULL,
    `dependenciesUid` VARCHAR(191) NULL,
    `stepProductUid` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykePricingSystem_id_key`(`id`),
    INDEX `DykePricingSystem_dykeStepId_idx`(`dykeStepId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeDoors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `query` VARCHAR(191) NULL,
    `doorType` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `img` VARCHAR(191) NULL,
    `price` DOUBLE NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeDoors_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeProducts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `img` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `noteRequired` BOOLEAN NULL DEFAULT false,
    `custom` BOOLEAN NULL,
    `title` VARCHAR(191) NULL,
    `price` DOUBLE NULL,
    `categoryId` INTEGER NULL,
    `productCode` VARCHAR(191) NULL,
    `qty` INTEGER NULL DEFAULT 0,
    `meta` JSON NULL,
    `value` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeProducts_id_key`(`id`),
    INDEX `DykeProducts_categoryId_idx`(`categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeProductPrices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `price` DOUBLE NOT NULL,
    `dimension` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `productId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeProductPrices_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeShelfCategories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `categoryId` INTEGER NULL,
    `parentCategoryId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeShelfCategories_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeShelfProducts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `unitPrice` DOUBLE NULL,
    `categoryId` INTEGER NULL,
    `parentCategoryId` INTEGER NULL,
    `img` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeShelfProducts_id_key`(`id`),
    INDEX `DykeShelfProducts_categoryId_idx`(`categoryId`),
    INDEX `DykeShelfProducts_parentCategoryId_idx`(`parentCategoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeSalesError` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `errorId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `restoredAt` DATETIME(3) NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DykeSalesError_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesTaxes` (
    `id` VARCHAR(191) NOT NULL,
    `salesId` INTEGER NOT NULL,
    `taxCode` VARCHAR(191) NOT NULL,
    `taxxable` DOUBLE NOT NULL,
    `tax` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `SalesTaxes_salesId_idx`(`salesId`),
    INDEX `SalesTaxes_taxCode_idx`(`taxCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Taxes` (
    `title` VARCHAR(191) NOT NULL,
    `taxCode` VARCHAR(191) NOT NULL,
    `percentage` DOUBLE NOT NULL DEFAULT 0.00,
    `taxOn` VARCHAR(191) NOT NULL DEFAULT 'total',
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Taxes_taxCode_key`(`taxCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesStat` (
    `salesId` INTEGER NOT NULL,
    `status` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `score` DOUBLE NULL,
    `total` DOUBLE NULL,
    `percentage` DOUBLE NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `SalesStat_salesId_idx`(`salesId`),
    UNIQUE INDEX `SalesStat_salesId_type_key`(`salesId`, `type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItemProductionAssignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `assignedToId` INTEGER NULL,
    `assignedById` INTEGER NOT NULL,
    `qtyAssigned` INTEGER NULL,
    `qtyCompleted` INTEGER NULL,
    `completedAt` DATETIME(3) NULL,
    `salesItemControlUid` VARCHAR(191) NULL,
    `lhQty` INTEGER NULL,
    `rhQty` INTEGER NULL,
    `note` VARCHAR(191) NULL,
    `salesDoorId` INTEGER NULL,
    `startedAt` TIMESTAMP(0) NULL,
    `dueDate` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `laborCost` DOUBLE NULL,
    `shelfItemId` INTEGER NULL,

    UNIQUE INDEX `OrderItemProductionAssignments_id_key`(`id`),
    INDEX `OrderItemProductionAssignments_shelfItemId_idx`(`shelfItemId`),
    INDEX `OrderItemProductionAssignments_salesItemControlUid_idx`(`salesItemControlUid`),
    INDEX `OrderItemProductionAssignments_orderId_idx`(`orderId`),
    INDEX `OrderItemProductionAssignments_itemId_idx`(`itemId`),
    INDEX `OrderItemProductionAssignments_assignedToId_idx`(`assignedToId`),
    INDEX `OrderItemProductionAssignments_assignedById_idx`(`assignedById`),
    INDEX `OrderItemProductionAssignments_salesDoorId_idx`(`salesDoorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderProductionSubmissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NULL,
    `salesOrderItemId` INTEGER NULL,
    `qty` INTEGER NOT NULL,
    `lhQty` INTEGER NULL DEFAULT 0,
    `rhQty` INTEGER NULL DEFAULT 0,
    `note` TEXT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `assignmentId` INTEGER NULL,
    `submittedById` INTEGER NULL,
    `meta` JSON NULL,

    UNIQUE INDEX `OrderProductionSubmissions_id_key`(`id`),
    INDEX `OrderProductionSubmissions_submittedById_idx`(`submittedById`),
    INDEX `OrderProductionSubmissions_salesOrderId_idx`(`salesOrderId`),
    INDEX `OrderProductionSubmissions_salesOrderItemId_idx`(`salesOrderItemId`),
    INDEX `OrderProductionSubmissions_assignmentId_idx`(`assignmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DykeSalesShelfItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderItemId` INTEGER NULL,
    `description` VARCHAR(191) NULL,
    `productId` INTEGER NULL,
    `categoryId` INTEGER NOT NULL,
    `qty` INTEGER NULL,
    `unitPrice` INTEGER NULL,
    `totalPrice` INTEGER NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `DykeSalesShelfItem_id_key`(`id`),
    INDEX `DykeSalesShelfItem_salesOrderItemId_idx`(`salesOrderItemId`),
    INDEX `DykeSalesShelfItem_productId_idx`(`productId`),
    INDEX `DykeSalesShelfItem_categoryId_idx`(`categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesCommision` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `userId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `orderPaymentId` INTEGER NOT NULL,
    `commissionPaymentId` INTEGER NULL,
    `status` VARCHAR(255) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SalesCommision_id_key`(`id`),
    INDEX `SalesCommision_orderId_idx`(`orderId`),
    INDEX `SalesCommision_userId_idx`(`userId`),
    INDEX `SalesCommision_orderPaymentId_idx`(`orderPaymentId`),
    INDEX `SalesCommision_commissionPaymentId_idx`(`commissionPaymentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrderProducts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesOrderId` INTEGER NOT NULL,
    `salesOrderItemId` INTEGER NOT NULL,
    `qty` INTEGER NULL,
    `stockQty` INTEGER NULL,
    `shortQty` INTEGER NULL,
    `productVariantId` INTEGER NULL,
    `productId` INTEGER NULL,
    `status` VARCHAR(255) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SalesOrderProducts_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesLaborCosts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rate` DOUBLE NOT NULL,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SalesLaborCosts_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refunds` (
    `id` VARCHAR(191) NOT NULL,
    `refId` VARCHAR(191) NOT NULL,
    `salesId` INTEGER NOT NULL,
    `refundSalesId` INTEGER NULL,
    `walletId` INTEGER NOT NULL,
    `total` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Refunds_id_key`(`id`),
    UNIQUE INDEX `Refunds_refundSalesId_key`(`refundSalesId`),
    INDEX `Refunds_salesId_idx`(`salesId`),
    INDEX `Refunds_walletId_idx`(`walletId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundTransactions` (
    `id` VARCHAR(191) NOT NULL,
    `refundId` VARCHAR(191) NOT NULL,
    `transactionId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `RefundTransactions_id_key`(`id`),
    INDEX `RefundTransactions_refundId_idx`(`refundId`),
    INDEX `RefundTransactions_transactionId_idx`(`transactionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesTakeOffTemplates` (
    `id` VARCHAR(191) NOT NULL,
    `sectionUid` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `SalesTakeOffTemplates_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `authorId` INTEGER NULL,
    `txId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `statusNote` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `walletId` INTEGER NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `squarePID` VARCHAR(191) NULL,

    UNIQUE INDEX `CustomerTransaction_id_key`(`id`),
    INDEX `CustomerTransaction_authorId_idx`(`authorId`),
    INDEX `CustomerTransaction_walletId_idx`(`walletId`),
    INDEX `CustomerTransaction_squarePID_idx`(`squarePID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerTransactionStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `authorName` VARCHAR(191) NULL,
    `authorId` INTEGER NOT NULL,
    `status` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `transactionId` INTEGER NOT NULL,

    UNIQUE INDEX `CustomerTransactionStatus_id_key`(`id`),
    INDEX `CustomerTransactionStatus_transactionId_idx`(`transactionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerWallet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `balance` DOUBLE NOT NULL,
    `accountNo` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `CustomerWallet_id_key`(`id`),
    UNIQUE INDEX `CustomerWallet_accountNo_key`(`accountNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesPayments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `note` VARCHAR(191) NULL,
    `authorId` INTEGER NULL,
    `squarePaymentsId` VARCHAR(191) NULL,
    `transactionId` INTEGER NULL,
    `orderId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `tip` DOUBLE NULL,
    `meta` JSON NULL,
    `status` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SalesPayments_id_key`(`id`),
    INDEX `SalesPayments_authorId_idx`(`authorId`),
    INDEX `SalesPayments_orderId_idx`(`orderId`),
    INDEX `SalesPayments_transactionId_idx`(`transactionId`),
    INDEX `SalesPayments_squarePaymentsId_idx`(`squarePaymentsId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SquarePayments` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'created',
    `squareOrderId` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentLink` VARCHAR(191) NULL,
    `terminalId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `tip` DOUBLE NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,

    UNIQUE INDEX `SquarePayments_paymentId_key`(`paymentId`),
    INDEX `SquarePayments_terminalId_idx`(`terminalId`),
    INDEX `SquarePayments_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SquarePaymentOrders` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` INTEGER NOT NULL,
    `squarePaymentId` VARCHAR(191) NOT NULL,

    INDEX `SquarePaymentOrders_squarePaymentId_idx`(`squarePaymentId`),
    INDEX `SquarePaymentOrders_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTerminals` (
    `terminalId` VARCHAR(191) NOT NULL,
    `terminalName` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PaymentTerminals_terminalId_key`(`terminalId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesCheckout` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `status` VARCHAR(191) NULL,
    `paymentType` VARCHAR(191) NULL,
    `terminalId` VARCHAR(191) NULL,
    `terminalName` VARCHAR(191) NULL,
    `amount` DOUBLE NULL,
    `tip` DOUBLE NULL DEFAULT 0,
    `orderId` INTEGER NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `salesPaymentsId` INTEGER NULL,
    `squarePaymentId` VARCHAR(191) NULL,

    UNIQUE INDEX `SalesCheckout_paymentId_key`(`paymentId`),
    UNIQUE INDEX `SalesCheckout_salesPaymentsId_key`(`salesPaymentsId`),
    UNIQUE INDEX `SalesCheckout_squarePaymentId_key`(`squarePaymentId`),
    INDEX `SalesCheckout_orderId_idx`(`orderId`),
    INDEX `SalesCheckout_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckoutTenders` (
    `id` VARCHAR(191) NOT NULL,
    `tenderId` VARCHAR(191) NOT NULL,
    `salesCheckoutId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NULL,
    `tip` DOUBLE NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `CheckoutTenders_tenderId_key`(`tenderId`),
    INDEX `CheckoutTenders_salesCheckoutId_idx`(`salesCheckoutId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoCompletes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AutoCompletes_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AddressBooks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NULL,
    `name` VARCHAR(255) NULL,
    `address1` VARCHAR(300) NULL,
    `address2` VARCHAR(300) NULL,
    `country` VARCHAR(255) NULL,
    `state` VARCHAR(255) NULL,
    `city` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `phoneNo` VARCHAR(255) NULL,
    `phoneNo2` VARCHAR(255) NULL,
    `isPrimary` BOOLEAN NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AddressBooks_id_key`(`id`),
    INDEX `AddressBooks_createdAt_deletedAt_name_address1_idx`(`createdAt`, `deletedAt`, `name`, `address1`),
    INDEX `AddressBooks_customerId_idx`(`customerId`),
    INDEX `AddressBooks_phoneNo_idx`(`phoneNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ErrorLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `data` VARCHAR(191) NULL,
    `meta` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ErrorLog_id_key`(`id`),
    INDEX `ErrorLog_userId_idx`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ErrorLogTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `errorLogId` INTEGER NOT NULL,
    `errorTagId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ErrorLogTags_id_key`(`id`),
    INDEX `ErrorLogTags_errorLogId_idx`(`errorLogId`),
    INDEX `ErrorLogTags_errorTagId_idx`(`errorTagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ErrorTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ErrorTags_id_key`(`id`),
    UNIQUE INDEX `ErrorTags_name_key`(`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `group` VARCHAR(191) NULL,
    `searchParams` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `userId` INTEGER NULL,

    INDEX `PageView_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `value` DOUBLE NULL DEFAULT 1,
    `userId` INTEGER NULL,

    INDEX `Event_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Migrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `migration` VARCHAR(255) NOT NULL,
    `batch` INTEGER NOT NULL,

    UNIQUE INDEX `Migrations_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModelHasPermissions` (
    `permissionId` INTEGER NOT NULL,
    `modelType` VARCHAR(255) NOT NULL,
    `modelId` BIGINT UNSIGNED NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`permissionId`, `modelId`, `modelType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModelHasRoles` (
    `roleId` INTEGER NOT NULL,
    `modelId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `ModelHasRoles_modelId_idx`(`modelId`),
    PRIMARY KEY (`roleId`, `modelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `usedAt` TIMESTAMP(0) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `PasswordResets_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Permissions_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NULL,
    `slug` VARCHAR(255) NULL,
    `type` VARCHAR(255) NOT NULL,
    `content` TEXT NULL,
    `meta` JSON NULL,
    `status` VARCHAR(255) NULL,
    `parentId` INTEGER NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Posts_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(255) NOT NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Settings_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductCategories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ProductCategories_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(255) NOT NULL,
    `section` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `size` VARCHAR(255) NULL,
    `type` VARCHAR(255) NULL,
    `box` VARCHAR(255) NULL,
    `price` DOUBLE NOT NULL,
    `finish` VARCHAR(255) NULL,
    `length` VARCHAR(255) NULL,
    `per` VARCHAR(255) NULL,
    `unitQty` VARCHAR(255) NULL,
    `itemNumber` VARCHAR(255) NULL,
    `lastUpdate` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `priceType` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Products_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentId` INTEGER NULL,
    `progressableId` INTEGER NULL,
    `progressableType` VARCHAR(255) NULL,
    `userId` INTEGER NULL,
    `status` VARCHAR(255) NULL,
    `type` VARCHAR(255) NULL,
    `headline` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Progress_id_key`(`id`),
    INDEX `Progress_userId_idx`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoleHasPermissions` (
    `permissionId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    INDEX `role_has_permissions_role_id_foreign`(`roleId`),
    PRIMARY KEY (`permissionId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Roles_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `techId` INTEGER NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `lot` VARCHAR(255) NULL,
    `block` VARCHAR(255) NULL,
    `projectName` VARCHAR(255) NULL,
    `builderName` VARCHAR(255) NULL,
    `requestDate` DATETIME(3) NULL,
    `supervisor` VARCHAR(255) NULL,
    `scheduleDate` TIMESTAMP(0) NULL,
    `scheduleTime` VARCHAR(255) NULL,
    `homeAddress` VARCHAR(255) NULL,
    `homeOwner` VARCHAR(255) NULL,
    `homePhone` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `status` VARCHAR(255) NULL,
    `assignedAt` TIMESTAMP(0) NULL,
    `completedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `WorkOrders_id_key`(`id`),
    UNIQUE INDEX `WorkOrders_slug_key`(`slug`),
    INDEX `WorkOrders_techId_idx`(`techId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meta` JSON NULL,
    `type` VARCHAR(191) NOT NULL,
    `fromUserId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `alert` BOOLEAN NULL,
    `deliveredAt` BOOLEAN NULL,
    `link` TEXT NULL,
    `seenAt` TIMESTAMP(0) NULL,
    `archivedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Notifications_id_key`(`id`),
    INDEX `Notifications_createdAt_deletedAt_userId_seenAt_archivedAt_idx`(`createdAt`, `deletedAt`, `userId`, `seenAt`, `archivedAt`),
    INDEX `Notifications_userId_idx`(`userId`),
    INDEX `Notifications_fromUserId_idx`(`fromUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `group` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Cache_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Blogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `authorId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `meta` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `publishedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Blogs_id_key`(`id`),
    UNIQUE INDEX `Blogs_slug_key`(`slug`),
    INDEX `Blogs_authorId_idx`(`authorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gallery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NULL,
    `src` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Gallery_id_key`(`id`),
    UNIQUE INDEX `Gallery_src_key`(`src`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GalleryTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `galleryId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `GalleryTag_id_key`(`id`),
    INDEX `GalleryTag_tagId_idx`(`tagId`),
    INDEX `GalleryTag_galleryId_idx`(`galleryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GalleryTagName` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `GalleryTagName_id_key`(`id`),
    UNIQUE INDEX `GalleryTagName_title_key`(`title`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteActionTicket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `event` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `siteActionNotificationId` INTEGER NOT NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SiteActionTicket_id_key`(`id`),
    INDEX `SiteActionTicket_siteActionNotificationId_idx`(`siteActionNotificationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteActionNotification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NULL,
    `custom` BOOLEAN NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SiteActionNotification_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteActionNotificationActiveForUsers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `siteActionNotificationId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SiteActionNotificationActiveForUsers_id_key`(`id`),
    INDEX `SiteActionNotificationActiveForUsers_siteActionNotificationI_idx`(`siteActionNotificationId`),
    UNIQUE INDEX `SiteActionNotificationActiveForUsers_userId_siteActionNotifi_key`(`userId`, `siteActionNotificationId`, `deletedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NULL,
    `name` VARCHAR(255) NULL,
    `username` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phoneNo` VARCHAR(255) NULL,
    `phoneCode` VARCHAR(255) NULL,
    `country` VARCHAR(255) NULL,
    `emailVerifiedAt` TIMESTAMP(0) NULL,
    `password` VARCHAR(255) NULL,
    `rememberToken` VARCHAR(100) NULL,
    `meta` JSON NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `employeeProfileId` INTEGER NULL,

    UNIQUE INDEX `Users_id_key`(`id`),
    INDEX `Users_createdAt_deletedAt_name_idx`(`createdAt`, `deletedAt`, `name`),
    INDEX `Users_employeeProfileId_idx`(`employeeProfileId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `session_token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expires` DATETIME(3) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `Session_session_token_key`(`session_token`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `discount` INTEGER NULL,
    `salesComissionPercentage` INTEGER NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deletedAt` TIMESTAMP(0) NULL,
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `EmployeeProfile_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserDocuments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `url` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `meta` JSON NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `UserDocuments_id_key`(`id`),
    INDEX `UserDocuments_userId_idx`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `meta` JSON NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ExportConfig_id_key`(`id`),
    INDEX `ExportConfig_createdById_idx`(`createdById`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageTabs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `page` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `private` BOOLEAN NULL DEFAULT true,
    `meta` JSON NULL,
    `title` VARCHAR(191) NOT NULL,
    `query` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `PageTabs_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageTabIndex` (
    `id` VARCHAR(191) NOT NULL,
    `tabId` INTEGER NOT NULL,
    `tabIndex` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `default` BOOLEAN NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    UNIQUE INDEX `PageTabIndex_id_key`(`id`),
    INDEX `PageTabIndex_tabId_idx`(`tabId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchParameters` (
    `page` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`page`, `key`, `value`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
