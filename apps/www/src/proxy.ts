import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { getLinkModules, validateLinks } from "./components/sidebar/links";
import { type AuthSnapshot, toAuthSnapshot } from "./lib/auth/auth-snapshot";

export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. all root files inside /public (e.g. /favicon.ico)
         */
        "/((?!api/|_next/|_static/|__nextjs|_vercel|[\\w-]+\\.\\w+).*)",
    ],
};

// export default async function middlewarex(req: NextRequest) {
//     return NextResponse.next();
// }
export default async function proxy(req: NextRequest) {
    const newUrl = req.nextUrl;
    const encodedSearchParams = `${newUrl?.pathname?.substring(1)}${
        newUrl.search
    }`;
    const searchParams = req.nextUrl.searchParams.toString();
    const path = `${newUrl.pathname}${
        searchParams.length > 0 ? `?${searchParams}` : ""
    }`;
    const pathName = req.nextUrl.pathname;
    const loginUrl = new URL("/login", req.url);
    if (encodedSearchParams) {
        loginUrl.searchParams.append("return_to", encodedSearchParams);
    }
    const isLogin = pathName === "/login";
    const auth = await getAuth(req);
    if (auth) {
        const defaultLink = getDefaultLink(auth);
        if (pathName === "/" || isLogin) {
            if (defaultLink && defaultLink !== pathName) {
                const url = new URL(defaultLink, req.url);
                return NextResponse.redirect(url);
            }
        } else if (!canAccessPath(auth, pathName)) {
            if (defaultLink && defaultLink !== pathName) {
                return NextResponse.redirect(new URL(defaultLink, req.url));
            }
        }
    }
    if (pathName === "/" || isLogin) {
        if (!isLogin) return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
}

async function getAuth(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.JWT_SECRET,
            secureCookie: req.nextUrl.protocol === "https:",
        });

        return toAuthSnapshot(token);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("[proxy] failed to resolve auth token", error);
        }
    }

    return null;
}

function getDefaultLink(auth) {
    const validLinks = getAuthorizedLinks(auth);
    return validLinks.defaultLink;
}

function canAccessPath(auth: AuthSnapshot, pathName: string) {
    const { linksNameMap } = getAuthorizedLinks(auth);
    const exactMatch = linksNameMap[pathName];
    if (exactMatch) {
        return exactMatch.hasAccess !== false;
    }

    const partialMatches = Object.entries(linksNameMap)
        .filter(([, value]) => value?.match === "part")
        .filter(([href]) => pathName.startsWith(href));

    if (!partialMatches.length) {
        return true;
    }

    return partialMatches.some(([, value]) => value?.hasAccess !== false);
}

function getAuthorizedLinks(auth: AuthSnapshot) {
    return getLinkModules(
        validateLinks({
            role: auth.role,
            can: auth.can,
            userId: auth?.userId,
        }),
    );
}

