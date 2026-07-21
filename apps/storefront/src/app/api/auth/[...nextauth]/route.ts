import { nextAuthOptions } from "@gnd/auth";
import NextAuth from "next-auth";

const handler = NextAuth(
  nextAuthOptions({
    secret: process.env.NEXTAUTH_SECRET,
  })
);
export { handler as GET, handler as POST };
