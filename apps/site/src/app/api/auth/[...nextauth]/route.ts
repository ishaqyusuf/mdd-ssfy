// import { auth } from "@/auth/server";

// export const GET = auth.handler;
// export const POST = auth.handler;

import { env } from "@/env.mjs";
import { nextAuthOptions } from "@gnd/auth";

import NextAuth from "next-auth";

const handler = NextAuth(
  nextAuthOptions({
    secret: env.NEXTAUTH_SECRET,
  })
);
export { handler as GET, handler as POST };
