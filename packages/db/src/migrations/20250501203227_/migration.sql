/*
  Warnings:

  - You are about to drop the column `editable` on the `SalesExtraCosts` table. All the data in the column will be lost.
  - You are about to alter the column `type` on the `SalesExtraCosts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(4))`.
  - Added the required column `label` to the `SalesExtraCosts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `SalesExtraCosts` DROP COLUMN `editable`,
    ADD COLUMN `label` VARCHAR(191) NOT NULL,
    MODIFY `type` ENUM('Discount', 'Labor', 'CustomTaxxable', 'CustomNonTaxxable') NOT NULL;
