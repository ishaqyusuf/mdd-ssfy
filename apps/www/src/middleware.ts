import { NextRequest, NextResponse } from "next/server";
import { getLinkModules, validateLinks } from "./components/sidebar/links";
import { consoleLog } from "@gnd/utils/index";

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

export default async function middlewarex(req: NextRequest) {
    // return NextResponse.next();
    const newUrl = req.nextUrl;
    // req.cookies.get
    // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
    let hostname = req.headers.get("host");
    const encodedSearchParams = `${newUrl?.pathname?.substring(1)}${
        newUrl.search
    }`;
    const searchParams = req.nextUrl.searchParams.toString();
    const path = `${newUrl.pathname}${
        searchParams.length > 0 ? `?${searchParams}` : ""
    }`;
    const pathName = req.nextUrl.pathname;
    // const _authorized = await authorized(req);

    const auth = await getAuth(req);
    // consoleLog("CAN->", auth?.can);
    // consoleLog("ROLE->", auth?.role);

    const loginUrl = new URL("/login", req.url);
    if (encodedSearchParams) {
        loginUrl.searchParams.append("return_to", encodedSearchParams);
    }
    if (!auth?.userId && !isPublic(pathName)) {
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
    if (isPublic(pathName)) return NextResponse.next();
    const validLinks = getLinkModules(
        validateLinks({
            role: auth.role,
            can: auth.can,
            userId: auth?.userId,
        })
    );
    // const matched = validLinks.linksNameMap[pathName];
    // if (matched) {
    //     consoleLog("matched link", matched);
    // }
    const v = validatePath(pathName, validLinks.linksNameMap);
    const prev = req.headers.get("referer");
    // consoleLog("->", { v, pathName, linkMap: validLinks.linksNameMap, prev });
    if (!v?.hasAccess) {
        // if (prev) {
        return NextResponse.redirect(new URL("/", req.url));
        // }
        // return NextResponse.rewrite(new URL("/404", req.url));
    }
    return NextResponse.next();
}
const validatePath = <T extends Record<string, any>>(
    path: string,
    links: T
): T[keyof T] & { href: string } => {
    const segments = path.split("/");
    const k = Object.keys(links).find((key) => {
        const keySegs = key.split("/");
        if (keySegs.length !== segments.length) return false;
        return keySegs.every(
            (seg, i) => seg.startsWith("slug") || seg === segments[i]
        );
    }) as keyof T | undefined;
    return {
        href: k as any,
        ...(links[k] || {}),
    } as any;
    // return k ? links[k] : undefined;
};

const isPublic = (pathName) =>
    ["/login", "/square-payment", "/checkout", "/api/pdf"]?.some((a) =>
        pathName.includes(a)
    );
// async function authorized(req: NextRequest) {
//     // const c = cookies();
//     const allCookies = req.cookies
//         .getAll()
//         .map((c) => `${c.name}=${c.value}`)
//         .join("; ");
//     const headers = {
//         "Content-Type": "application/json",
//         Cookie: allCookies,
//     };
//     const url = new URL(`/api/auth/session`, req.url);
//     const response = await fetch(url.href, {
//         headers,
//         cache: "no-store",
//     });
//     const data = await response.json();
//     return !!data?.user;
// }
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
        })
    );
    return validLinks.defaultLink;
}

