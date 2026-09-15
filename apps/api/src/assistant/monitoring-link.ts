/** Only a configured Sentry organization and a submitted event ID can form a link. */
export function assistantMonitoringLink(details: unknown): string | null {
	if (!details || typeof details !== "object" || !("monitoring" in details)) return null;
	const monitoring = details.monitoring;
	if (!monitoring || typeof monitoring !== "object") return null;
	const { status, organization, eventId } = monitoring as Record<string, unknown>;
	if (status !== "submitted" || typeof organization !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(organization) || typeof eventId !== "string" || !/^[a-f0-9]{32}$/.test(eventId)) return null;
	const url = new URL(`https://sentry.io/organizations/${organization}/issues/`);
	url.searchParams.set("query", eventId);
	url.searchParams.set("statsPeriod", "30d");
	return url.toString();
}
