import {
  createDealerAccountSchema,
  getDealersSchema,
  resendDealerOnboardingSchema,
  searchDealerCustomerCandidatesSchema,
} from "@api/schemas/dealer";
import {
  createDealerAccount,
  getDealers,
  resendDealerOnboardingInvite,
  searchDealerCustomerCandidates,
} from "@gnd/db/queries";
import { NotificationService } from "@gnd/notifications/services/triggers";
import { TRPCError } from "@trpc/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { createTRPCRouter, protectedProcedure } from "../init";

function getDealershipUrl() {
  if (process.env.NEXT_PUBLIC_DEALERSHIP_URL) {
    return process.env.NEXT_PUBLIC_DEALERSHIP_URL.replace(/\/$/, "");
  }

  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "https://dealers.gndprodesk.com";
  }

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3501";
}

export const dealerRouter = createTRPCRouter({
  list: protectedProcedure.input(getDealersSchema).query(async ({ ctx, input }) => {
    return getDealers(ctx.db, {
      search: input.search,
      status: input.status,
      take: input.size,
    });
  }),
  searchCustomerCandidates: protectedProcedure
    .input(searchDealerCustomerCandidatesSchema)
    .query(async ({ ctx, input }) => {
      return searchDealerCustomerCandidates(ctx.db, input);
    }),
  createAccount: protectedProcedure
    .input(createDealerAccountSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const result = await createDealerAccount(ctx.db, {
        ...input,
        authorId: ctx.userId,
      });
      const onboardingLink = `${getDealershipUrl()}/create-password/${result.invite.token}`;

      await new NotificationService(tasks, ctx).channel.dealerOnboarding({
        dealerId: result.dealer.id,
        dealerName: result.dealer.name || input.name || result.dealer.email,
        dealerEmail: result.dealer.email,
        onboardingLink,
        expiresAt: result.invite.expiredAt?.toISOString() || null,
        recipients: [
          {
            ids: [result.notificationRecipient.id],
            role: result.notificationRecipient.role,
          },
        ],
      });

      return result;
    }),
  resendOnboarding: protectedProcedure
    .input(resendDealerOnboardingSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const result = await resendDealerOnboardingInvite(ctx.db, {
        dealerId: input.dealerId,
        authorId: ctx.userId,
      });
      const onboardingLink = `${getDealershipUrl()}/create-password/${result.invite.token}`;

      await new NotificationService(tasks, ctx).channel.dealerOnboarding({
        dealerId: result.dealer.id,
        dealerName:
          result.dealer.companyName || result.dealer.name || result.dealer.email,
        dealerEmail: result.dealer.email,
        onboardingLink,
        expiresAt: result.invite.expiredAt?.toISOString() || null,
        recipients: [
          {
            ids: [result.notificationRecipient.id],
            role: result.notificationRecipient.role,
          },
        ],
      });

      return result;
    }),
});
