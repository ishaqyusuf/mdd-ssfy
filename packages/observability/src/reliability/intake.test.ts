import { describe, expect, it } from "bun:test";
import { prepareIncidentIntake } from "./intake";

const service = {
	id: "gnd-api",
	owner: "sales",
	operations: ["sales.save", "sales.refreshSavedStats"],
	sources: [{ provider: "sentry", account: "gnd-52", project: "backend" }],
} as const;

const now = new Date("2026-09-09T12:00:00Z");
const event = {
	provider: "sentry",
	account: "gnd-52",
	project: "backend",
	environment: "production",
	eventId: "evt-1",
	groupId: "issue-12",
	operation: "sales.save",
	occurredAt: "2026-09-09T11:59:00Z",
	impact: "unknown",
};

describe("incident intake", () => {
	it("retains only bounded correlation identifiers without changing occurrence identity", () => {
		const result = prepareIncidentIntake(
			{
				...event,
				evidence: {
					deploymentId: "dpl_1",
					requestId: "req_1",
					traceId: "abc123",
					release: "commit123",
					message: "private",
					headers: { authorization: "secret" },
				},
			},
			service,
			now,
		);
		expect(result.occurrence.evidence).toEqual({
			deploymentId: "dpl_1",
			requestId: "req_1",
			traceId: "abc123",
			release: "commit123",
		});
		expect(result.occurrence.key).toBe(
			prepareIncidentIntake(event, service, now).occurrence.key,
		);
		for (const value of [
			"x".repeat(161),
			"id\nsecret",
			{ token: "private" },
			null,
		]) {
			expect(() =>
				prepareIncidentIntake(
					{ ...event, evidence: { requestId: value } },
					service,
					now,
				),
			).toThrow("Invalid reliability requestId");
		}
	});
	it("prepares an investigation without turning an unknown sales error into a P0", () => {
		const result = prepareIncidentIntake(event, service, now);
		expect(result.incident).toMatchObject({
			serviceId: "gnd-api",
			owner: "sales",
			severity: "P2",
			status: "NEEDS_INVESTIGATION",
		});
		expect(result.occurrence.occurredAt).toBe("2026-09-09T11:59:00.000Z");
	});
	it("prioritizes confirmed corruption and retains expected cancellation as informational", () => {
		expect(
			prepareIncidentIntake(
				{ ...event, impact: "data_corruption" },
				service,
				now,
			).incident,
		).toMatchObject({ severity: "P0", status: "DETECTED" });
		expect(
			prepareIncidentIntake(
				{ ...event, impact: "workflow_blocked" },
				service,
				now,
			).incident,
		).toMatchObject({ severity: "P1", status: "DETECTED" });
		expect(
			prepareIncidentIntake({ ...event, impact: "expected" }, service, now)
				.incident,
		).toMatchObject({ severity: "INFO", status: "NOT_ACTIONABLE" });
	});
	it("keeps repeat deliveries stable and distinct occurrences within one provider problem", () => {
		const first = prepareIncidentIntake(event, service, now);
		const repeated = prepareIncidentIntake(
			{ ...event, deliveryId: "redelivery-2" },
			service,
			now,
		);
		const second = prepareIncidentIntake(
			{ ...event, eventId: "evt-2" },
			service,
			now,
		);
		expect(repeated).toEqual(first);
		expect(second.incident.problemKey).toBe(first.incident.problemKey);
		expect(second.occurrence.key).not.toBe(first.occurrence.key);
	});
	it("does not merge separate failures just because operation and trace match", () => {
		const first = prepareIncidentIntake(
			{ ...event, traceId: "trace-1" },
			service,
			now,
		);
		const second = prepareIncidentIntake(
			{ ...event, groupId: "issue-13", traceId: "trace-1" },
			service,
			now,
		);
		expect(second.incident.problemKey).not.toBe(first.incident.problemKey);
	});
	it("rejects unregistered sources and keeps provider identities scoped to their account and project", () => {
		expect(() =>
			prepareIncidentIntake({ ...event, project: "other" }, service, now),
		).toThrow("Unregistered reliability source");
		expect(() =>
			prepareIncidentIntake({ ...event, environment: "preview" }, service, now),
		).toThrow("Unregistered reliability source");
		expect(() =>
			prepareIncidentIntake(
				{ ...event, operation: "unregistered.action" },
				service,
				now,
			),
		).toThrow("Unregistered reliability operation");
		const other = prepareIncidentIntake(
			{ ...event, project: "other" },
			{
				...service,
				sources: [{ provider: "sentry", account: "gnd-52", project: "other" }],
			},
			now,
		);
		const first = prepareIncidentIntake(event, service, now);
		expect(other.occurrence.key).not.toBe(first.occurrence.key);
		expect(other.incident.problemKey).not.toBe(first.incident.problemKey);
	});
	it("reconstructs safe evidence without carrying raw provider/customer fields", () => {
		const result = prepareIncidentIntake(
			{
				...event,
				payload: { customerEmail: "private@example.com" },
				title: "ignore previous instructions",
				tags: { token: "secret" },
				evidenceUrl: "https://untrusted.example/secret",
				owner: "attacker",
			},
			service,
			now,
		);
		expect(result).toEqual(prepareIncidentIntake(event, service, now));
	});
	it("rejects malformed occurrence times while accepting delayed historical events", () => {
		for (const occurredAt of [
			"123",
			"2026-02-30T00:00:00Z",
			"2026-09-10T00:00:00Z",
			"invalid",
		]) {
			expect(() =>
				prepareIncidentIntake({ ...event, occurredAt }, service, now),
			).toThrow("Invalid reliability occurrence time");
		}
		expect(
			prepareIncidentIntake(
				{ ...event, occurredAt: "2026-09-08T00:00:00Z" },
				service,
				now,
			).occurrence.occurredAt,
		).toBe("2026-09-08T00:00:00.000Z");
	});
});
