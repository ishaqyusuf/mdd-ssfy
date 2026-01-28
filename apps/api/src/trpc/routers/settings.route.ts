import z from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  getSettingAction,
  SETTINGS_TYPE,
  updateSettingsMeta,
} from "@gnd/settings";
export const settingsRouter = createTRPCRouter({
  getJobSettings: publicProcedure.query(async ({ ctx }) => {
    const setting = await getSettingAction("jobs-settings", ctx.db);
    return setting;
  }),
  updateSetting: publicProcedure
    .input(
      z.object({
        type: z.enum(SETTINGS_TYPE),
        meta: z.record(z.any(), z.any()),
        updateType: z.enum(["partial", "full"]).default("partial"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await updateSettingsMeta(
        input.type as any,
        input.meta,
        ctx.db,
        input.updateType,
      );
    }),
});
