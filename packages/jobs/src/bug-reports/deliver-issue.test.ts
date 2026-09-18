import { afterAll, describe, expect, it } from "bun:test";
import { createDatabaseClient } from "@gnd/db";
import { createBugReportDelivery } from "@gnd/db/queries";
import { deliverDueBugReportIssues } from "./deliver-issue";

const enabled = process.env.BUG_REPORT_DELIVERY_INTEGRATION_TEST === "1";
const db = createDatabaseClient();
const reportIds: string[] = [];
const clock = new Date("2026-09-18T15:00:00.000Z");
const env = {
	BUG_REPORT_GITHUB_TOKEN: "test-token",
	BUG_REPORT_GITHUB_REPOSITORY: "owner/repo",
	BUG_REPORT_GITHUB_ACTOR_ID: "42",
	BUG_REPORT_APP_BASE_URL: "https://app.example.com",
};

async function createFixture() {
	const report = await db.bugReport.create({
		data: {
			createdById: 1,
			captureType: "SCREENSHOT",
			description: "The submit button does not respond.",
			currentUrl: "https://app.example.com/sales?customer=private#dialog",
			source: "integration-test",
		},
	});
	reportIds.push(report.id);
	await db.$transaction((tx) =>
		createBugReportDelivery(tx, {
			reportId: report.id,
			provider: "GITHUB",
			repository: "owner/repo",
			now: clock,
		}),
	);
	return report;
}

afterAll(async () => {
	if (reportIds.length) {
		await db.bugReportDelivery.deleteMany({
			where: { reportId: { in: reportIds } },
		});
		await db.bugReport.deleteMany({ where: { id: { in: reportIds } } });
	}
	await db.$disconnect();
});

describe.skipIf(!enabled)("bug report GitHub delivery worker", () => {
	it("creates one issue and persists its receipt", async () => {
		const report = await createFixture();
		let requests = 0;
		const result = await deliverDueBugReportIssues(db, {
			env,
			now: () => clock,
			request: async () => {
				requests += 1;
				return Response.json(
					{
						number: 901,
						html_url: "https://github.com/owner/repo/issues/901",
					},
					{ status: 201 },
				);
			},
		});
		expect(requests).toBe(1);
		expect(result.find((item) => item.reportId === report.id)?.status).toBe(
			"CREATED",
		);
		const saved = await db.bugReportDelivery.findUnique({
			where: { reportId: report.id },
		});
		expect(saved).toMatchObject({
			state: "CREATED",
			remoteIssueNumber: 901,
		});
	});

	it("holds an ambiguous create without blindly posting again", async () => {
		const report = await createFixture();
		let createRequests = 0;
		let discoveryRequests = 0;
		const request = async (
			_url: string | URL | Request,
			init?: RequestInit,
		) => {
			if (init?.method === "POST") createRequests += 1;
			else discoveryRequests += 1;
			throw new Error("connection lost after write");
		};
		const first = await deliverDueBugReportIssues(db, {
			env,
			now: () => clock,
			request,
		});
		expect(first.find((item) => item.reportId === report.id)?.status).toBe(
			"UNCERTAIN",
		);
		await deliverDueBugReportIssues(db, {
			env,
			now: () => new Date(clock.getTime() + 120_000),
			request,
		});
		expect(createRequests).toBe(1);
		expect(discoveryRequests).toBeGreaterThan(0);
		expect(
			await db.bugReportDelivery.findUnique({ where: { reportId: report.id } }),
		).toMatchObject({ state: "UNCERTAIN" });
	});
});
