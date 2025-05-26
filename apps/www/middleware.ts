import { NextRequest, NextResponse } from "next/server";
import { env } from "./env.mjs";
import { getLoggedInProfile } from "./actions/cache/get-loggedin-profile";
import { getLinkModules, validateLinks } from "./components/sidebar/links";
import { getSideMenuMode } from "./actions/cookies/sidemenu";
import { getServerSession } from "next-auth";
import { authOptions } from "./lib/auth-options";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

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

export default async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    // console.log([req.url, req.nextUrl]);

    // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
    let hostname = req.headers.get("host");
    // .replace(".localhost:3002", `.${env.NEXT_PUBLIC_ROOT_DOMAIN}`);
    // special case for Vercel preview deployment URLs
    // if (
    //   hostname.includes("---") &&
    //   hostname.endsWith(`.${env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)
    // ) {
    //   hostname = `${hostname.split("---")[0]}.${
    //     env.NEXT_PUBLIC_ROOT_DOMAIN
    //   }`;
    // }

    const searchParams = req.nextUrl.searchParams.toString();
    const path = `${url.pathname}${
        searchParams.length > 0 ? `?${searchParams}` : ""
    }`;

    const pathName = req.nextUrl.pathname;
    if (pathName == "/") {
        const usr = await fetch(`${req.nextUrl.origin}/api/auth-session`, {
            method: "POST",
            headers: req.headers,
        });
        if (usr.ok) {
            const data = await usr.json();
            if (data?.roleId) {
                const validLinks = getLinkModules(
                    validateLinks({
                        role: data.role,
                        can: data.can,
                        userId: data?.userId,
                    }),
                );
                const menuMode = await getSideMenuMode();
                // console.log({
                //     userId: data?.userId,
                //     pathName,
                //     defaultPage: validLinks.defaultLink,
                // });
                if (pathName == "/" && validLinks.defaultLink) {
                    return NextResponse.redirect(
                        `${req.nextUrl.origin}${validLinks.defaultLink}`,
                    );
                }
            }
        }
    }
    // rewrites for app pages
    if (hostname == `shop.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
        return NextResponse.rewrite(
            new URL(`/shop${path === "/" ? "" : path}`, req.url),
        );
    }
    if (hostname == `shop-admin.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
        // const session = await getToken({ req });
        // if (!session && path !== "/login") {
        // return NextResponse.redirect(new URL("/login", req.url));
        // } else if (session && path == "/login") {
        // return NextResponse.redirect(new URL("/", req.url));
        // }
        // console.log("=====SAAS=====", path);
        return NextResponse.rewrite(
            new URL(`/shop-admin${path === "/" ? "" : path}`, req.url),
        );
    }
    if (hostname == `print.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
        // const session = await getToken({ req });
        // if (!session && path !== "/login") {
        // return NextResponse.redirect(new URL("/login", req.url));
        // } else if (session && path == "/login") {
        // return NextResponse.redirect(new URL("/", req.url));
        // }
        // console.log("=====SAAS=====", path);
        return NextResponse.rewrite(
            new URL(`/printer${path === "/" ? "" : path}`, req.url),
        );
    }
    if (hostname == `print.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
        // const session = await getToken({ req });
        // if (!session && path !== "/login") {
        // return NextResponse.redirect(new URL("/login", req.url));
        // } else if (session && path == "/login") {
        // return NextResponse.redirect(new URL("/", req.url));
        // }
        // console.log("=====SAAS=====", path);
        return NextResponse.rewrite(
            new URL(`/printer${path === "/" ? "" : path}`, req.url),
        );
    }
    if (hostname == `download.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
        // const session = await getToken({ req });
        // if (!session && path !== "/login") {
        // return NextResponse.redirect(new URL("/login", req.url));
        // } else if (session && path == "/login") {
        // return NextResponse.redirect(new URL("/", req.url));
        // }
        // console.log("=====SAAS=====", path);
        return NextResponse.rewrite(
            new URL(`/download${path === "/" ? "" : path}`, req.url),
        );
    }

    // special case for `vercel.pub` domain
    // if (hostname === "vercel.pub") {
    //   return NextResponse.redirect(
    //     "https://vercel.com/blog/platforms-starter-kit"
    //   );
    // }

    // rewrite root application to `/home` folder
    // if (
    //     hostname === "localhost:3002" ||
    //     hostname === env.NEXT_PUBLIC_ROOT_DOMAIN
    // ) {
    //     // console.log("..");
    //     return NextResponse.rewrite(
    //         new URL(`/public${path === "/" ? "" : path}`, req.url)
    //     );
    // }
    // console.log(">>>>>>>>>>>>>>>");
    // rewrite everything else to `/[domain]/[slug] dynamic route
    // console.log(["+++TENANT+++", hostname, path]);
    const response = NextResponse.next();
    return response;
    // return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url));
}
