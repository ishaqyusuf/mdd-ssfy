"use client";

import { useTrack } from "@gnd/events/client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function dealerSection(pathname: string) {
	if (pathname.startsWith("/quotes")) return "quotes";
	if (pathname.startsWith("/orders")) return "orders";
	if (pathname.startsWith("/customers")) return "customers";
	if (pathname.startsWith("/settings")) return "settings";
	return "dashboard";
}

export function DealerAnalyticsTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const track = useTrack();
	const search = searchParams.toString();

	useEffect(() => {
		track({
			event: "Dealer Program Progress Viewed",
			pathname,
			section: dealerSection(pathname),
			hasFilters: search.length > 0,
		});
	}, [pathname, search, track]);

	return null;
}
