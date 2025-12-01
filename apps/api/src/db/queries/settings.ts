import type { TRPCContext } from "@api/trpc/init";
import type { SalesSettingsMeta, SettingType } from "@api/type";

export const salesSettingsKey: SettingType = "sales-settings";
export async function getSalesSetting(ctx: TRPCContext) {
  return await getSetting<SalesSettingsMeta>(ctx, "sales-settings");
}
export async function getSetting<T>(ctx: TRPCContext, type: SettingType) {
  const s = await ctx.db.settings.findFirst({
    where: {
      type,
    },
  });
  return {
    id: s?.id,
    data: s?.meta as T,
  };
}
