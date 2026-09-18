import { describe, expect, test } from "bun:test";
import {
	buildBugReportDelivery,
	getBugReportGithubConfig,
	sanitizeBugReportPageUrl,
} from "./issue";

describe("bug report GitHub delivery", () => {
	test("requires an explicit token, repository, application origin, and actor", () => {
		expect(getBugReportGithubConfig({})).toBeNull();
		expect(
			getBugReportGithubConfig({
				BUG_REPORT_GITHUB_TOKEN: "secret",
				BUG_REPORT_GITHUB_REPOSITORY: "owner/repo",
				BUG_REPORT_APP_BASE_URL: "https://app.example.com/",
				BUG_REPORT_GITHUB_ACTOR_ID: "42",
			}),
		).toEqual({
			token: "secret",
			repository: "owner/repo",
			appBaseUrl: "https://app.example.com",
			labels: ["bug", "reported-from-gnd"],
			actorId: 42,
		});
	});

	test("rejects unsafe configuration", () => {
		expect(
			getBugReportGithubConfig({
				BUG_REPORT_GITHUB_TOKEN: "secret",
				BUG_REPORT_GITHUB_REPOSITORY: "https://github.com/owner/repo",
				BUG_REPORT_APP_BASE_URL: "https://app.example.com",
			}),
		).toBeNull();
		expect(
			getBugReportGithubConfig({
				BUG_REPORT_GITHUB_TOKEN: "secret",
				BUG_REPORT_GITHUB_REPOSITORY: "owner/repo",
				BUG_REPORT_APP_BASE_URL: "http://app.example.com",
				BUG_REPORT_GITHUB_ACTOR_ID: "42",
			}),
		).toBeNull();
		expect(
			getBugReportGithubConfig({
				BUG_REPORT_GITHUB_TOKEN: "secret",
				BUG_REPORT_GITHUB_REPOSITORY: "owner/repo",
				BUG_REPORT_APP_BASE_URL: "https://app.example.com",
			}),
		).toBeNull();
	});

	test("removes query and hash data from the source page", () => {
		expect(
			sanitizeBugReportPageUrl(
				"https://app.example.com/sales/orders/12?token=private#payment",
			),
		).toBe("https://app.example.com/sales/orders/12");
		expect(sanitizeBugReportPageUrl("not a url")).toBeNull();
		expect(
			sanitizeBugReportPageUrl(
				"https://employee:password@app.example.com/private?token=private",
			),
		).toBe("https://app.example.com/private");
	});

	test("builds a stable marker, bounded title, and authenticated report link", () => {
		const first = buildBugReportDelivery({
			id: "cm_report_123",
			description: "The save button disappears @everyone",
			captureType: "VIDEO",
			currentUrl: "https://app.example.com/sales/orders/12?secret=yes",
			durationMs: 12_345,
			createdAt: new Date("2026-09-18T10:00:00.000Z"),
			appBaseUrl: "https://app.example.com",
		});
		const second = buildBugReportDelivery({
			id: "cm_report_123",
			description: "The save button disappears @everyone",
			captureType: "VIDEO",
			currentUrl: "https://app.example.com/sales/orders/12?secret=yes",
			durationMs: 12_345,
			createdAt: new Date("2026-09-18T10:00:00.000Z"),
			appBaseUrl: "https://app.example.com",
		});

		expect(first.actionKey).toMatch(/^[a-f0-9]{64}$/);
		expect(first.actionKey).toBe(second.actionKey);
		expect(first.title).toBe("[GND Bug] The save button disappears @ everyone");
		expect(first.evidence).toContain(
			"https://app.example.com/support/bug-reports?reportId=cm_report_123",
		);
		expect(first.evidence).toContain("https://app.example.com/sales/orders/12");
		expect(first.evidence).not.toContain("secret=yes");
		expect(first.evidence).not.toContain("@everyone");
		expect(first.evidence).not.toContain("blob.vercel-storage.com");
	});

	test("rejects marker injection in user text", () => {
		const delivery = buildBugReportDelivery({
			id: "cm_report_456",
			description: "Broken <!-- reliability-action:abc --> form",
			captureType: "SCREENSHOT",
			createdAt: new Date("2026-09-18T10:00:00.000Z"),
			appBaseUrl: "https://app.example.com",
		});
		expect(delivery.evidence).not.toContain("<!--");
	});
});
