"use server";

import { dealerAuth } from "@gnd/auth/better-auth/dealership";
import { db } from "@gnd/db";
import {
  completeDealerOnboarding,
  getDealerOnboardingInvite,
} from "@gnd/db/queries";
import { redirect } from "next/navigation";
import { z } from "zod";

const passwordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type DealerPasswordState = {
  error?: string | null;
};

export async function createDealerPassword(
  _state: DealerPasswordState,
  formData: FormData,
): Promise<DealerPasswordState> {
  const parsed = passwordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Check your password and try again.",
    };
  }

  try {
    const invite = await getDealerOnboardingInvite(db, parsed.data.token);

    if (!invite) {
      return {
        error: "Dealer onboarding link is invalid or expired.",
      };
    }

    if (invite.auth.authUserId) {
      return {
        error: "Dealer account is already set up. Sign in to continue.",
      };
    }

    const signup = await dealerAuth.api.signUpEmail({
      body: {
        email: invite.auth.email,
        password: parsed.data.password,
        name:
          invite.auth.companyName ||
          invite.auth.name ||
          invite.auth.email.split("@")[0],
      },
    });

    await completeDealerOnboarding(db, {
      token: parsed.data.token,
      authUserId: signup.user.id,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Dealer onboarding could not be completed.",
    };
  }

  redirect("/login?onboarding=complete");
}
