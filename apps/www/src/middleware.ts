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
        try {
            const userUrl = `${req.nextUrl.origin}/api/auth-session`;
            console.log(userUrl);

            const usr = await fetch(userUrl, {
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
                    // const menuMode = await getSideMenuMode();
                    // console.log({
                    //     userId: data?.userId,
                    //     pathName,
                    //     defaultPage: validLinks.defaultLink,
                    // });
                    // console.log(validLinks.defaultLink);

                    if (pathName == "/" && validLinks.defaultLink) {
                        return NextResponse.redirect(
                            `${req.nextUrl.origin}${validLinks.defaultLink}`,
                        );
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching user data", error);
        }
        // } catch (error) {}
    }
    // rewrites for app pages
    if (hostname == `shop.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
        return NextResponse.rewrite(
            new URL(`/shop${path === "/" ? "" : path}`, req.url),
        );
    }

    const response = NextResponse.next();
    return response;
    // return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url));
}
