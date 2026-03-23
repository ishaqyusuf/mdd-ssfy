import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { getLinkModules, validateLinks } from "./components/sidebar/links";
import { toAuthSnapshot } from "./lib/auth/auth-snapshot";

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
	if (pathName === "/" || isLogin) {
		const auth = await getAuth(req);
		if (auth) {
			const link = getDefaultLink(auth);
			if (link && link !== pathName) {
				const url = new URL(link, req.url);
				return NextResponse.redirect(url);
			}
		}
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
	const validLinks = getLinkModules(
		validateLinks({
			role: auth.role,
			can: auth.can,
			userId: auth?.userId,
		}),
	);
	return validLinks.defaultLink;
}
