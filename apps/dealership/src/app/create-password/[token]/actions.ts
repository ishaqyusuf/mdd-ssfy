"use server";

import { db } from "@gnd/db";
import { completeDealerOnboarding } from "@gnd/db/queries";
import { hashPassword } from "@gnd/utils/crypto";
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
    await completeDealerOnboarding(db, {
      token: parsed.data.token,
      passwordHash: await hashPassword(parsed.data.password),
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
