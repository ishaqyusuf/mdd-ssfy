import type { TRPCContext } from "@api/trpc/init";
import type { SalesSettingsMeta, SettingType } from "@api/type";

export const salesSettingsKey: SettingType = "sales-settings";
export async function getSalesSetting(ctx: TRPCContext) {
  const s = await ctx.db.settings.findFirst({
    where: {
      type: salesSettingsKey,
    },
  });
  return {
    id: s?.id,
    data: s?.meta as SalesSettingsMeta,
  };
}
