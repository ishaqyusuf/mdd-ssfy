"use client";

import type { AnalyticsBatch } from "@ishaqyusuf/logly-core";
import { AnalyticsProvider, useAnalytics } from "@ishaqyusuf/logly-next";
import { type ReactNode, useCallback } from "react";
import { safeBatch } from "./policy";

const project = process.env.NEXT_PUBLIC_LOGLY_PROJECT ?? "gnd-web";
type TrackProperties = Record<string, unknown>;

async function transport(batch: AnalyticsBatch) {
	const sanitized = safeBatch(batch, project, "web");
	if (!sanitized.events.length) return;
	const response = await fetch("/api/analytics", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(sanitized),
		keepalive: true,
	});
	if (!response.ok) throw new Error("Analytics delivery failed");
}

const Provider = ({ children }: { children: ReactNode }) => (
	<AnalyticsProvider
		project={project}
		endpoint="/api/analytics"
		disabled={process.env.NEXT_PUBLIC_LOGLY_ENABLED !== "true"}
		respectPrivacySignals
		autoTrackPageViews
		permission={() =>
			typeof document !== "undefined" &&
			document.cookie.includes("tracking-consent=0")
				? "denied"
				: "allowed"
		}
		transport={transport}
	>
		{children}
	</AnalyticsProvider>
);

const useTrack = () => {
	const analytics = useAnalytics();

	return useCallback(
		(options: { event: string } & TrackProperties) => {
			const { event, ...rest } = options;
			analytics.track(event, rest);
		},
		[analytics],
	);
};

export { Provider, useTrack };
