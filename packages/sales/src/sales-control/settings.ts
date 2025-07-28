import { Db, SalesSettingsMeta, SettingType } from "../types";

export const salesSettingsKey: SettingType = "sales-settings";
export async function getSalesSetting(prisma: Db) {
  const s = await prisma.settings.findFirst({
    where: {
      type: salesSettingsKey,
    },
  });
  return {
    id: s?.id,
    data: s?.meta as SalesSettingsMeta,
  };
}
