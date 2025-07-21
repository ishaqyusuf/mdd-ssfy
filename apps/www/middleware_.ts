import { withAuth } from "next-auth/middleware";

// More on how NextAuth.js middleware works: https://next-auth.js.org/configuration/nextjs#middleware
export default withAuth({
    callbacks: {
        authorized({ req, token }) {
            // `/admin` requires admin role

            return true;
            // if (req.nextUrl.pathname === "/admin") {
            //   return token?.userRole === "admin";
            // }
            // // `/me` only requires the user to be logged in
            // return !!token;
        },
    },
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

