-- AlterTable
ALTER TABLE `CustomerTypes` ADD COLUMN `salesPercentage` DOUBLE NULL;

-- Backfill dealer-owned profiles from the legacy coefficient value.
UPDATE `CustomerTypes`
SET `salesPercentage` = (`coefficient` - 1) * 100
WHERE `dealerOwnerId` IS NOT NULL
  AND `coefficient` IS NOT NULL;
