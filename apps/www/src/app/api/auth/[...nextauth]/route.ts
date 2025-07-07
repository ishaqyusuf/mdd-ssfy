import { loginAction } from "@/app/(v1)/_actions/auth";
import { prisma, Roles, Users } from "@/db";
import { authOptions } from "@/lib/auth-options";
import { ICan } from "@/types/auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// import { authOptions } from "@/server/auth";
declare module "next-auth" {
    // interface User {
    //     user: Users;
    //     can: ICan;
    //     role: Roles;
    // }

    interface Session extends DefaultSession {
        // user: {
        user: Users;
        can: ICan;
        role: Roles;
    }
}
// declare module "next-auth/jwt" {
//     /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
//     interface JWT {
//         user: Users;
//         can: ICan;
//         role: Roles;
//     }
// }
// export const nextAuthOptions = {
//     adapter: PrismaAdapter(prisma as any),
//     session: {
//         strategy: "jwt",
//     },
//     secret: process.env.SECRET,
//     providers: [
//         CredentialsProvider({
//             name: "Sign in",
//             credentials: {
//                 email: {
//                     label: "Email",
//                     type: "email",
//                     placeholder: "example@example.com",
//                 },
//                 password: { label: "Password", type: "password" },
//             },
//             async authorize(credentials) {
//                 if (!credentials) {
//                     return null;
//                 }
//                 const login = await loginAction(credentials);
//                 return login;
//             },
//         }),
//     ],
// };
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
