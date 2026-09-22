export function getRoutingRevision(data: unknown): number | undefined {
	if (!data || typeof data !== "object" || !("revision" in data)) return;
	return typeof data.revision === "number" ? data.revision : undefined;
}

export function getRoutingStaleTime(enabled: boolean, data: unknown) {
	// Other consumers (including Assistant) don't mount the form's revision probe.
	// Preserve their existing one-minute freshness bound.
	return enabled && getRoutingRevision(data) != null ? 60_000 : 0;
}

export function routingNeedsRevisionRefresh(
	data: unknown,
	revision: number,
	firstObservation: boolean,
) {
	// Let an initial request finish; its arrival is observed by the form hook.
	if (data == null) return false;
	const routingRevision = getRoutingRevision(data);
	// Untagged responses retain the legacy one-time probe and stale-on-mount policy.
	if (routingRevision == null) return firstObservation;
	// A slow revision probe must not invalidate a newer routing response.
	return routingRevision < revision;
}
