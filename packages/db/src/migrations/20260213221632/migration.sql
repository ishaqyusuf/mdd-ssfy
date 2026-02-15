-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- CreateTable
CREATE TABLE `NoteChannels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emailSupport` BOOLEAN NULL,
    `textSupport` BOOLEAN NULL,
    `whatsappSupport` BOOLEAN NULL,
    `inAppSupport` BOOLEAN NULL,
    `priority` INTEGER NULL,
    `channelName` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `NoteChannels_id_key`(`id`),
    UNIQUE INDEX `NoteChannels_channelName_key`(`channelName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssignedUserNoteChannel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `noteChannelId` INTEGER NULL,
    `notePadContactsId` INTEGER NULL,
    `textEnabled` BOOLEAN NULL,
    `whatsappEnabled` BOOLEAN NULL,
    `emailEnabled` BOOLEAN NULL,
    `inAppEnabled` BOOLEAN NULL,

    UNIQUE INDEX `AssignedUserNoteChannel_id_key`(`id`),
    INDEX `AssignedUserNoteChannel_noteChannelId_idx`(`noteChannelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserNoteChannelConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `noteChannelId` INTEGER NULL,

    UNIQUE INDEX `UserNoteChannelConfig_id_key`(`id`),
    INDEX `UserNoteChannelConfig_noteChannelId_idx`(`noteChannelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteChannelRole` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `roleId` INTEGER NULL,
    `noteChannelId` INTEGER NULL,

    UNIQUE INDEX `NoteChannelRole_id_key`(`id`),
    INDEX `NoteChannelRole_noteChannelId_idx`(`noteChannelId`),
    INDEX `NoteChannelRole_roleId_idx`(`roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
