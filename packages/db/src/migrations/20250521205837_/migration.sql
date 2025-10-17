/*
  Warnings:

  - A unique constraint covering the columns `[uid,deletedAt]` on the table `Payroll` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Payroll_uid_key` ON `Payroll`;

-- CreateIndex
CREATE UNIQUE INDEX `Payroll_uid_deletedAt_key` ON `Payroll`(`uid`, `deletedAt`);
