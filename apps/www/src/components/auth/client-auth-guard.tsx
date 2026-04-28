"use client";

import { AUTH_LOGIN_ROUTE, isAuthLoginPath } from "@/lib/auth/auth-routes";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type ClientAuthGuardProps = {
	children: ReactNode;
	loginPath?: string;
};

export function ClientAuthGuard({
	children,
	loginPath = AUTH_LOGIN_ROUTE,
}: ClientAuthGuardProps) {
	const { status } = useSession();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const hasRedirectedRef = useRef(false);

	useEffect(() => {
		if (status !== "unauthenticated" || hasRedirectedRef.current) {
			return;
		}

		hasRedirectedRef.current = true;
		window.location.assign(buildLoginUrl(loginPath, pathname, searchParams));
	}, [loginPath, pathname, searchParams, status]);

	if (status === "unauthenticated") {
		return null;
	}

	return <>{children}</>;
}

function buildLoginUrl(
	loginPath: string,
	pathname: string | null,
	searchParams: ReturnType<typeof useSearchParams>,
) {
	if (!pathname || isAuthLoginPath(pathname)) {
		return loginPath;
	}

	const currentSearch = searchParams.toString();
	const returnTo = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;

	return `${loginPath}?return_to=${encodeURIComponent(returnTo)}`;
}
