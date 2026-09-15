/** Independent signal when the report limiter prevents diagnostic capture.
 * One fixed event per process per minute; never copy an untrusted report here.
 */
export function createAssistantClientReportHealth(
	emit: () => void = () => console.error("assistant_client_reports_unavailable", {
		operation: "assistant.clientReportLimiter",
		recorded: false,
	}),
	now: () => number = Date.now,
) {
	let lastEmitted: number | undefined;
	return () => {
		const current = now();
		if (lastEmitted !== undefined && current >= lastEmitted && current - lastEmitted < 60_000) return;
		lastEmitted = current;
		try { emit(); } catch { /* A broken log sink must not replace the safe rejection. */ }
	};
}

export const reportAssistantClientCaptureUnavailable = createAssistantClientReportHealth();
