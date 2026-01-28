import { type Db } from "@gnd/db";
import { SettingsTypes } from "./schema";
export const SETTINGS_TYPE = [
  "sales-settings",
  "install-price-chart",
  "jobs-settings",
  //   "allow-custom-jobs",
] as const;

export type SettingType = (typeof SETTINGS_TYPE)[number];

export async function getSettingAction<T extends keyof SettingsTypes>(
  type: T,
  db: Db,
) {
  // const type: PostType = "sales-settings";
  const setting = await db.settings.findFirst({
    where: {
      type,
    },
  });
  if (!setting) {
    let newSetting = await db.settings.create({
      data: {
        type,
        meta: {},
      },
    });
    return newSetting as SettingsTypes[T];
  }
  return setting as SettingsTypes[T];
}
export async function updateSettingsMeta<T extends keyof SettingsTypes>(
  type: T,
  meta: SettingsTypes[T]["meta"],
  db: Db,
  updateType: "partial" | "full" = "full",
) {
  const settings = await getSettingAction<T>(type, db);
  if (!settings?.id) throw Error("Setting not found");
  const id = settings.id;
  const newMeta =
    updateType === "partial"
      ? { ...(settings.meta || {}), ...(meta as any) }
      : meta;
  await db.settings.update({
    where: { id },
    data: {
      meta: newMeta,
    },
  });
}
