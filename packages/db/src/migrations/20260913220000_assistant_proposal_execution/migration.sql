ALTER TABLE `AssistantActionProposal`
    ADD COLUMN `confirmationRequestId` VARCHAR(191) NULL,
    ADD COLUMN `executionStartedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `executionCompletedAt` TIMESTAMP(0) NULL,
    ADD COLUMN `result` JSON NULL,
    ADD COLUMN `errorCode` VARCHAR(100) NULL;

CREATE UNIQUE INDEX `asst_proposal_confirmation_request_uq`
    ON `AssistantActionProposal`(`confirmationRequestId`);
