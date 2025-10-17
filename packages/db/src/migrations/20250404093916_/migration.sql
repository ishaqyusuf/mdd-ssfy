-- RedefineIndex
CREATE INDEX `HomeTasks_homeId_idx` ON `HomeTasks`(`homeId`);
DROP INDEX `idx_HomeTasks_on_homeId` ON `HomeTasks`;
