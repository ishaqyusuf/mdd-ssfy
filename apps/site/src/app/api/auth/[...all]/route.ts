// import { auth } from "@/auth/server";

// export const GET = auth.handler;
// export const POST = auth.handler;

import { nextAuthOptions } from "@gnd/auth";

import NextAuth from "next-auth";

const handler = NextAuth(nextAuthOptions);
export { handler as GET, handler as POST };
