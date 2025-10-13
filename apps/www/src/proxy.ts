import { NextRequest, NextResponse } from "next/server";
import { env } from "./env.mjs";
import { getLinkModules, validateLinks } from "./components/sidebar/links";

export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. all root files inside /public (e.g. /favicon.ico)
         */
        "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    ],
};

export default async function proxy(req: NextRequest) {
    const newUrl = req.nextUrl;

    // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
    let hostname = req.headers.get("host");
    const encodedSearchParams = `${newUrl?.pathname?.substring(1)}${newUrl.search}`;
    const searchParams = req.nextUrl.searchParams.toString();
    const path = `${newUrl.pathname}${
        searchParams.length > 0 ? `?${searchParams}` : ""
    }`;
    const pathName = req.nextUrl.pathname;
    const auth = await getAuth(req);
    console.log(auth);
    const loginUrl = new URL("/login", req.url);
    if (encodedSearchParams) {
        loginUrl.searchParams.append("return_to", encodedSearchParams);
    }
    if (!auth && !isPublic(pathName)) {
        return NextResponse.redirect(loginUrl);
    }
    if (path === "/") {
        if (auth) {
            const link = getDefaultLink(auth);
            const url = new URL(link, req.url);
            return NextResponse.redirect(url);
        }
        return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
}
const isPublic = (pathName) => ["/login"]?.some((a) => pathName.includes(a));
async function getAuth(req) {
    try {
        const userUrl = `${req.nextUrl.origin}/api/auth-session`;
        const usr = await fetch(userUrl, {
            method: "POST",
            headers: req.headers,
        });
        if (usr.ok) {
            const data = await usr.json();
            return {
                role: data?.role,
                can: data?.can,
                userId: data?.userId,
            };
        }
    } catch (error) {}
    return null;
}

function getDefaultLink(auth) {
    const validLinks = getLinkModules(
        validateLinks({
            role: auth.role,
            can: auth.can,
            userId: auth?.userId,
        }),
    );
    return validLinks.defaultLink;
}

