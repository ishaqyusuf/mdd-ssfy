import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../index";
import {
	bugReportDeliveryActionKey,
	claimDueBugReportDeliveries,
	createBugReportDelivery,
	recordBugReportDeliveryReceipt,
	requeueBugReportDelivery,
	settleBugReportDelivery,
} from "./bug-report-delivery";

const enabled = process.env.BUG_REPORT_DELIVERY_INTEGRATION_TEST === "1";
const url = process.env.DATABASE_URL;
if (enabled) {
	const target = new URL(url ?? "http://invalid");
	if (
		target.protocol !== "mysql:" ||
		target.hostname !== "127.0.0.1" ||
		target.port !== "3307" ||
		target.pathname !== "/gnd-prisma2"
	) {
		throw new Error(
			"Bug report delivery integration tests require the verified local database",
		);
	}
}

const db = createDatabaseClient();
const reportIds: string[] = [];
const now = new Date("2026-09-18T12:00:00.000Z");

async function createDeliveryFixture() {
	const report = await db.bugReport.create({
		data: {
			createdById: 1,
			captureType: "VIDEO",
			source: "integration-test",
		},
		select: { id: true },
	});
	reportIds.push(report.id);
	return db.$transaction(async (tx) =>
		createBugReportDelivery(tx, {
			reportId: report.id,
			provider: "GITHUB",
			repository: "owner/repo",
			now,
		}),
	);
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

describe.skipIf(!enabled)("bug report durable delivery", () => {
	it("creates one stable delivery action for a report", async () => {
		const report = await db.bugReport.create({
			data: {
				createdById: 1,
				captureType: "VIDEO",
				source: "integration-test",
			},
			select: { id: true },
		});
		reportIds.push(report.id);

		const first = await db.$transaction(async (tx) =>
			createBugReportDelivery(tx, {
				reportId: report.id,
				provider: "GITHUB",
				repository: "owner/repo",
				now,
			}),
		);
		const second = await db.$transaction(async (tx) =>
			createBugReportDelivery(tx, {
				reportId: report.id,
				provider: "GITHUB",
				repository: "owner/repo",
				now,
			}),
		);

		expect(second.id).toBe(first.id);
		expect(first.actionKey).toBe(bugReportDeliveryActionKey(report.id));
	});

	it("claims one delivery once and adopts a reconciled GitHub receipt", async () => {
		const delivery = await createDeliveryFixture();
		const firstClaim = await claimDueBugReportDeliveries(db, { now });
		const claim = firstClaim.find((item) => item.id === delivery.id);
		if (!claim) throw new Error("Expected the new delivery to be claimed");

		const secondClaim = await claimDueBugReportDeliveries(db, { now });
		expect(secondClaim.some((item) => item.id === delivery.id)).toBe(false);
		expect(claim.attempts).toBe(1);

		expect(
			await settleBugReportDelivery(db, {
				deliveryId: delivery.id,
				leaseId: randomUUID(),
				now: new Date(now.getTime() + 1_000),
				outcome: {
					state: "UNCERTAIN",
					errorCode: "GITHUB_CREATE_UNCERTAIN",
				},
			}),
		).toBe(false);

		expect(
			await settleBugReportDelivery(db, {
				deliveryId: delivery.id,
				leaseId: claim.leaseId,
				now: new Date(now.getTime() + 1_000),
				outcome: {
					state: "UNCERTAIN",
					errorCode: "GITHUB_CREATE_UNCERTAIN",
				},
			}),
		).toBe(true);

		expect(
			await recordBugReportDeliveryReceipt(db, {
				deliveryId: delivery.id,
				now: new Date(now.getTime() + 2_000),
				issueNumber: 77,
				issueKey: "#77",
				issueUrl: "https://github.com/owner/repo/issues/77",
			}),
		).toBe(true);

		const saved = await db.bugReportDelivery.findUnique({
			where: { id: delivery.id },
			select: { state: true, remoteIssueKey: true },
		});
		const report = await db.bugReport.findUnique({
			where: { id: claim.reportId },
			select: { externalIssueKey: true, externalIssueStatus: true },
		});
		expect(saved).toMatchObject({
			state: "CREATED",
			remoteIssueKey: "#77",
		});
		expect(report).toMatchObject({
			externalIssueKey: "#77",
			externalIssueStatus: "CREATED",
		});
	});

	it("requeues a failed delivery without allowing a duplicate claim while processing", async () => {
		const delivery = await createDeliveryFixture();
		const claims = await claimDueBugReportDeliveries(db, { now });
		const claim = claims.find((item) => item.id === delivery.id);
		if (!claim) throw new Error("Expected the new delivery to be claimed");

		expect(
			await settleBugReportDelivery(db, {
				deliveryId: delivery.id,
				leaseId: claim.leaseId,
				now: new Date(now.getTime() + 1_000),
				outcome: { state: "FAILED", errorCode: "GITHUB_FORBIDDEN" },
			}),
		).toBe(true);
		expect(
			await requeueBugReportDelivery(db, {
				deliveryId: delivery.id,
				now: new Date(now.getTime() + 2_000),
			}),
		).toBe(true);

		const requeued = await claimDueBugReportDeliveries(db, {
			now: new Date(now.getTime() + 2_000),
		});
		expect(requeued.some((item) => item.id === delivery.id)).toBe(true);
	});
});
