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

		let pendingFrame = 0;
		let requestId = 0;
		const onStepClick = (event: MouseEvent) => {
			const button = (event.target as Element).closest<HTMLButtonElement>(
				'nav[aria-label="Item configuration steps"] button[aria-label^="Open "]',
			);
			if (!button || button.getAttribute("aria-current") === "step") return;
			const line = button.closest<HTMLElement>('[id^="sales-form-item-line-"]');
			if (!line) return;
			const label = button.getAttribute("aria-label")?.slice(5);
			if (!label) return;
			const startedAt = performance.now();
			const currentRequest = ++requestId;
			cancelAnimationFrame(pendingFrame);

			const checkCards = () => {
				if (currentRequest !== requestId || !line.isConnected) return;
				if (performance.now() - startedAt > 10000) return;
				const active = line.querySelector<HTMLButtonElement>(
					'nav[aria-label="Item configuration steps"] button[aria-current="step"]',
				);
				const heading = [...line.querySelectorAll("p")].find(
					(element) => element.textContent?.trim() === `Select Component: ${label}`,
				);
				const cards = heading?.parentElement?.parentElement?.querySelectorAll(
					'[data-workflow-component-boundary="true"] .grid button.w-full.text-left',
				);
				if (active === button && cards?.length) {
					pendingFrame = requestAnimationFrame(() => {
						if (currentRequest === requestId) {
							console.info("Sales catalog step timing", JSON.stringify({
								step: label,
								cards: cards.length,
								durationMs: Math.round(performance.now() - startedAt),
							}));
						}
					});
					return;
				}
				pendingFrame = requestAnimationFrame(checkCards);
			};
			pendingFrame = requestAnimationFrame(checkCards);
		};
		document.addEventListener("click", onStepClick, true);
		return () => {
			requestId++;
			cancelAnimationFrame(pendingFrame);
			document.removeEventListener("click", onStepClick, true);
			observer.disconnect();
		};
	}, []);
}
