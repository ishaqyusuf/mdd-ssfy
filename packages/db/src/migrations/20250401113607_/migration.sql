/*
  Warnings:

  - You are about to drop the `Testings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `Testings`;

-- CreateTable
CREATE TABLE `Todos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gitTasksId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `deletedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Todos_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
