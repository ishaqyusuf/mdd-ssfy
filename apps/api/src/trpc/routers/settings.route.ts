import z from "zod";
import type { TRPCContext } from "../init";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import {
  getSettingAction,
  SETTINGS_TYPE,
  updateSettingsMeta,
} from "@gnd/settings";
import { TRPCError } from "@trpc/server";

const appDownloadInputSchema = z.object({
  downloadUrl: z.string().url("Enter a valid download URL"),
  version: z.string().trim().max(120).nullable().optional(),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid expiry date"),
  notes: z.string().trim().max(1000).nullable().optional(),
});

async function requireSuperAdmin(ctx: TRPCContext) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const user = await ctx.db.users.findFirst({
    where: {
      id: ctx.userId,
    },
    select: {
      roles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const role = user?.roles?.[0]?.role?.name;
  if (role?.toLowerCase() !== "super admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Super Admin can manage app download settings.",
    });
  }
}

function toExpiryIso(expiresOn: string) {
  return new Date(`${expiresOn}T23:59:59.999Z`).toISOString();
}

export const settingsRouter = createTRPCRouter({
  getJobSettings: publicProcedure.query(async ({ ctx }) => {
    const setting = await getSettingAction("jobs-settings", ctx.db);
    return setting;
  }),
  getAppDownloadSettings: protectedProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx);

    return getSettingAction("app-download-apk", ctx.db);
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
  updateAppDownloadSettings: protectedProcedure
    .input(appDownloadInputSchema)
    .mutation(async ({ input, ctx }) => {
      await requireSuperAdmin(ctx);

      const [setting, user] = await Promise.all([
        getSettingAction("app-download-apk", ctx.db),
        ctx.db.users.findFirst({
          where: {
            id: ctx.userId,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        }),
      ]);

      const expiresAt = toExpiryIso(input.expiresOn);
      const currentMeta = ((setting.meta || {}) as Record<string, unknown>) || {};
      const shouldResetReminder =
        currentMeta.expiresAt !== expiresAt ||
        currentMeta.downloadUrl !== input.downloadUrl ||
        currentMeta.version !== (input.version?.trim() || null);

      await updateSettingsMeta(
        "app-download-apk",
        {
          ...currentMeta,
          downloadUrl: input.downloadUrl,
          version: input.version?.trim() || null,
          notes: input.notes?.trim() || null,
          expiresAt,
          uploadedAt: new Date().toISOString(),
          uploadedBy: {
            id: user?.id ?? null,
            name: user?.name ?? null,
            email: user?.email ?? null,
          },
          reminderSentAt: shouldResetReminder
            ? null
            : (currentMeta.reminderSentAt as string | null | undefined) || null,
          reminderSentForExpiry: shouldResetReminder
            ? null
            : ((currentMeta.reminderSentForExpiry as string | null | undefined) ??
              null),
        },
        ctx.db,
        "full",
      );

      return getSettingAction("app-download-apk", ctx.db);
    }),
});
