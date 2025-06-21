/*
  Warnings:

  - You are about to drop the `GitStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GitTags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GitTasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Todos` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;

-- DropTable
DROP TABLE `GitStatus`;

-- DropTable
DROP TABLE `GitTags`;

-- DropTable
DROP TABLE `GitTasks`;

-- DropTable
DROP TABLE `Tags`;

-- DropTable
DROP TABLE `Todos`;

-- CreateTable
CREATE TABLE `Backlogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BacklogNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,
    `backlogId` INTEGER NULL,

    UNIQUE INDEX `BacklogNote_id_key`(`id`),
    INDEX `BacklogNote_backlogId_idx`(`backlogId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BacklogTags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tagId` INTEGER NOT NULL,
    `backlogId` INTEGER NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `todoId` INTEGER NULL,

    UNIQUE INDEX `BacklogTags_id_key`(`id`),
    INDEX `BacklogTags_backlogId_idx`(`backlogId`),
    INDEX `BacklogTags_tagId_idx`(`tagId`),
    INDEX `BacklogTags_todoId_idx`(`todoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BacklogTagTitles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BacklogTagTitles_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
