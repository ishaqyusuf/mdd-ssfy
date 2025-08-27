import { Roles, Users } from "@/db";
import { nextAuthOptions } from "@gnd/auth";

import NextAuth, { DefaultSession } from "next-auth";

const handler = NextAuth(nextAuthOptions);
export { handler as GET, handler as POST };
