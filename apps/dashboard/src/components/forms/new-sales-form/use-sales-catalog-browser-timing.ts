import { useEffect } from "react";

const operations = [
	"getComponentCatalog",
	"getComponentUsageRanks",
	"getStepRouting",
	"getCatalogRevision",
	"searchCustomComponents",
] as const;

/** Diagnostic only: resource timing contains no response or customer data. */
export function useSalesCatalogBrowserTiming() {
	useEffect(() => {
		if (
			process.env.NODE_ENV === "production" ||
			!new URLSearchParams(window.location.search).has("salesCatalogTiming") ||
			typeof PerformanceObserver === "undefined"
		) return;

		const report = (entries: PerformanceEntry[]) => {
			for (const entry of entries) {
				if (entry.entryType !== "resource") continue;
				const resource = entry as PerformanceResourceTiming;
				const url = new URL(resource.name);
				if (url.origin !== window.location.origin) continue;
				const matching = operations.filter((operation) =>
					url.pathname.includes(operation),
				);
				if (!matching.length) continue;
				const input = url.searchParams.get("input") || "";
				const stepIds = [...input.matchAll(/"stepId":(\d+)/g)]
					.map((match) => Number(match[1]));
				console.info("Sales catalog browser timing", JSON.stringify({
					operations: matching,
					stepIds,
					durationMs: Math.round(resource.duration),
					transferBytes: resource.transferSize,
					decodedBytes: resource.decodedBodySize,
				}));
			}
		};
		const observer = new PerformanceObserver((list) => report(list.getEntries()));
		observer.observe({ type: "resource", buffered: true });
		return () => observer.disconnect();
	}, []);
}
