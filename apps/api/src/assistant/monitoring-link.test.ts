import { expect, test } from "bun:test";
import { assistantMonitoringLink } from "./monitoring-link";

test("uses captured organization and exact event, with a fixed trusted origin", () => {
	const eventId = "a".repeat(32);
	const link = assistantMonitoringLink({ monitoring: { status: "submitted", organization: "gnd-qa", eventId, url: "https://attacker.test" } });
	expect(link).toBe(`https://sentry.io/organizations/gnd-qa/issues/?query=${eventId}&statsPeriod=30d`);
});

test("missing, failed and malformed monitoring data never become links", () => {
	for (const monitoring of [null, {}, { status: "failed" }, { status: "submitted", eventId: "a".repeat(32) }, ...["../evil", "org/evil", "org?key=private", "https://evil", ""].map(organization => ({ status: "submitted", organization, eventId: "a".repeat(32) })), { status: "submitted", organization: "gnd", eventId: "private-token" }]) {
		expect(assistantMonitoringLink({ monitoring })).toBeNull();
	}
});
