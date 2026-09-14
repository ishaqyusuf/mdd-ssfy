CREATE TABLE `AssistantRuntimeSetting` (
  `key` VARCHAR(50) NOT NULL,
  `provider` VARCHAR(40) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `updatedByUserId` INTEGER NOT NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AssistantRuntimeSettingEvent` (
  `id` VARCHAR(191) NOT NULL,
  `settingKey` VARCHAR(50) NOT NULL,
  `provider` VARCHAR(40) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `version` INTEGER NOT NULL,
  `actorUserId` INTEGER NOT NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `asst_runtime_setting_event_version_uq`(`settingKey`, `version`),
  INDEX `asst_runtime_setting_event_actor_idx`(`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
