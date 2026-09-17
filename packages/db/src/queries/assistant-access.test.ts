import { describe, expect, test } from "bun:test";
import { evaluateAssistantAccessState } from "./assistant-access";

const now = new Date("2026-09-17T12:00:00.000Z");

describe("Assistant access state", () => {
	test("fails closed without an entitlement or when globally disabled", () => {
		expect(evaluateAssistantAccessState(null, now)).toEqual({
			enabled: false,
			status: "disabled",
			expiresAt: null,
			version: 0,
		});
		expect(
			evaluateAssistantAccessState(
				{ enabled: true, expiresAt: null, version: 4 },
				now,
				false,
			),
		).toEqual({
			enabled: false,
			status: "disabled",
			expiresAt: null,
			version: 4,
		});
	});

	test("distinguishes disabled, expired, and active snapshots", () => {
		expect(
			evaluateAssistantAccessState(
				{ enabled: false, expiresAt: null, version: 2 },
				now,
			),
		).toMatchObject({ enabled: false, status: "disabled" });
		expect(
			evaluateAssistantAccessState(
				{
					enabled: true,
					expiresAt: new Date("2026-09-17T11:59:59.000Z"),
					version: 3,
				},
				now,
			),
		).toMatchObject({ enabled: false, status: "expired" });
		expect(
			evaluateAssistantAccessState(
				{
					enabled: true,
					expiresAt: new Date("2026-09-17T12:00:01.000Z"),
					version: 5,
				},
				now,
			),
		).toMatchObject({ enabled: true, status: "enabled" });
	});
});
