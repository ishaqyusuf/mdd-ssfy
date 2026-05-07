import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";

import { type SessionUser, useAppSession } from "./session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; message: string };

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    return session.data.user ?? null;
  },
);

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResult> => {
    const configuredEmail = process.env.GND_WEB_DEMO_EMAIL ?? "admin@gnd.local";
    const configuredPassword =
      process.env.GND_WEB_DEMO_PASSWORD ?? "change-me-in-env";

    if (
      data.email.toLowerCase() !== configuredEmail.toLowerCase() ||
      data.password !== configuredPassword
    ) {
      return {
        ok: false,
        message: "Invalid email or password.",
      };
    }

    const user: SessionUser = {
      id: "migration-admin",
      email: configuredEmail,
      role: "admin",
    };
    const session = await useAppSession();

    await session.update({ user });

    return { ok: true, user };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useAppSession();

  await session.clear();

  throw redirect({ search: { redirect: "/dashboard" }, to: "/login" });
});
