"use client";

import { usePathname, useRouter } from "next/navigation";

function stringifyQuery(value: unknown) {
	if (!value || typeof value !== "object") return "";

	const searchParams = new URLSearchParams();

	for (const [key, entry] of Object.entries(value)) {
		if (entry === null || typeof entry === "undefined") continue;
		if (Array.isArray(entry)) {
			for (const item of entry) {
				if (item === null || typeof item === "undefined") continue;
				searchParams.append(key, String(item));
			}
			continue;
		}
		searchParams.set(key, String(entry));
	}

	return searchParams.toString();
}

export function useOnCloseQuery() {
	const pathname = usePathname();
	const router = useRouter();

	return {
		handle<TParams extends { onCloseQuery?: unknown }>(
			params: TParams,
			setParams: (
				value: null,
				options?: { shallow?: boolean; scroll?: boolean },
			) => Promise<URLSearchParams>,
		) {
			const data = params?.onCloseQuery;

			setParams(null, { shallow: true, scroll: false }).then(() => {
				if (!data) return;
				const query = stringifyQuery(data);
				router.push(query ? `${pathname}?${query}` : pathname);
			});
		},
	};
}
