-- DropIndex
DROP INDEX `CommunityTemplateInputConfig_uid_communityTemplateBlockConfi_key` ON `CommunityTemplateInputConfig`;

-- AlterTable
ALTER TABLE `ClockinBreak` ALTER COLUMN `clockIn` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ClockinSession` ALTER COLUMN `clockIn` DROP DEFAULT;
