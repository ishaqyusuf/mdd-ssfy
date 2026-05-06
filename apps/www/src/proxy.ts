import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { getLinkModules, validateLinks } from "./components/sidebar-links";
import { createAuthLoginUrl, isAuthLoginPath } from "./lib/auth/auth-routes";
import { type AuthSnapshot, toAuthSnapshot } from "./lib/auth/auth-snapshot";
import {
	resolveCanonicalPath,
	resolveRedirectPath,
} from "./lib/routing/redirect-engine";

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
	const resolvedRedirect = resolveRedirectPath(newUrl.toString());
	if (resolvedRedirect) {
		const redirectUrl = new URL(
			`${resolvedRedirect.pathname}${resolvedRedirect.search}`,
			req.url,
		);
		return NextResponse.redirect(redirectUrl, {
			status: resolvedRedirect.permanent ? 308 : 307,
		});
	}

	const searchParams = req.nextUrl.searchParams.toString();
	const path = `${newUrl.pathname}${
		searchParams.length > 0 ? `?${searchParams}` : ""
	}`;
	const pathName = req.nextUrl.pathname;
	const returnTo = getReturnToPath(newUrl);
	const safeReturnTo = getSafeReturnTo(req);
	const loginUrl = createAuthLoginUrl(req, returnTo);
	const isLogin = isAuthLoginPath(pathName);
	const auth = await getAuth(req);
	if (auth) {
		const defaultLink = getDefaultLink(auth);
		const returnToPathName = safeReturnTo
			? new URL(safeReturnTo, req.url).pathname
			: null;
		const preferredRedirect =
			returnToPathName && canAccessPath(auth, returnToPathName)
				? safeReturnTo
				: defaultLink;
		if (pathName === "/" || isLogin) {
			if (preferredRedirect && preferredRedirect !== path) {
				const url = new URL(preferredRedirect, req.url);
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

function getSafeReturnTo(req: NextRequest) {
	const returnTo = req.nextUrl.searchParams.get("return_to");
	if (!returnTo || !returnTo.startsWith("/")) {
		return null;
	}

	return resolveCanonicalPath(returnTo);
}

function getReturnToPath(url: NextRequest["nextUrl"]) {
	if (url.pathname === "/") {
		return null;
	}

	return resolveCanonicalPath(`${url.pathname}${url.search}`);
}
