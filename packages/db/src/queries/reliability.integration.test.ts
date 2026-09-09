import { afterAll, describe, expect, it } from "bun:test";
import { createHash, createHmac, randomUUID } from "node:crypto";
import {
	prepareIncidentIntake,
	prepareSentryAlert,
	prepareTriggerRun,
} from "@gnd/observability/reliability";
import { handleVercelDrainRequest } from "../../../../apps/api/src/rest/reliability-vercel";
import { handleVercelDeploymentRequest } from "../../../../apps/api/src/rest/reliability-vercel-deployment";
import { reconcileSentrySource } from "../../../jobs/src/reliability/reconcile-sentry";
import { reconcileTriggerSource } from "../../../jobs/src/reliability/reconcile-trigger";
import { reconcileVercelSource } from "../../../jobs/src/reliability/reconcile-vercel";
import { createDatabaseClient } from "../index";
import {
	getReliabilityIncident,
	ingestReliabilityOccurrence,
} from "./reliability";
import { applyReliabilityAction } from "./reliability-actions";
import {
	claimReliabilityCursor,
	deferReliabilityCursor,
	recordReliabilityCursorPage,
} from "./reliability-cursor";
import {
	claimReliabilityDelivery,
	getReliabilityDeliveryHealth,
	recordReliabilityDeliveryReceipt,
	settleReliabilityDelivery,
} from "./reliability-delivery";
import {
	getDueTriggerWatches,
	getTriggerReconciliationHealth,
	recordTriggerRunObservation,
} from "./reliability-trigger";

const enabled = process.env.RELIABILITY_INTEGRATION_TEST === "1";
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
			"Reliability integration tests require the verified local database",
		);
	}
}
const db = createDatabaseClient();
const service = {
	id: `reliability-test-${randomUUID()}`,
	owner: "test-owner",
	operations: ["sales.save"],
	sources: [
		{ provider: "sentry", account: "test-account", project: "test-project" },
	],
} as const;
const now = new Date("2026-09-09T12:00:00.000Z");
const cursorId = createHash("sha256")
	.update(`${service.id}:cursor`)
	.digest("hex");
const cursorIds = [cursorId];
function event(id: string, overrides: Record<string, unknown> = {}) {
	return prepareIncidentIntake(
		{
			provider: "sentry",
			account: "test-account",
			project: "test-project",
			environment: "production",
			eventId: `${service.id}-${id}`,
			groupId: service.id,
			operation: "sales.save",
			occurredAt: now.toISOString(),
			impact: "unknown",
			...overrides,
		},
		service,
		now,
	);
}

afterAll(async () => {
	if (enabled) {
		await db.reliabilityCursor.deleteMany({ where: { id: { in: cursorIds } } });
		const incidents = { serviceId: service.id };
		await db.reliabilityRunWatch.deleteMany({
			where: { serviceId: service.id },
		});
		await db.reliabilityDelivery.deleteMany({ where: { incident: incidents } });
		await db.reliabilityTransition.deleteMany({
			where: { incident: incidents },
		});
		await db.reliabilityOccurrence.deleteMany({
			where: { incident: incidents },
		});
		await db.reliabilityIncident.deleteMany({ where: incidents });
	}
	await db.$disconnect();
});

describe.skipIf(!enabled)("durable reliability intake", () => {
	it("resumes subdivided Vercel discovery after its query budget expires", async () => {
		const source = {
			account: "vercel-cursor",
			project: "web",
			operation: "sales.save",
			service: {
				...service,
				sources: [
					{
						provider: "vercel" as const,
						account: "vercel-cursor",
						project: "web",
					},
				],
			},
		};
		let clock = new Date("2026-09-09T12:00:00Z");
		const options = {
			now: () => clock,
			maxQueries: 1,
			maxDurationMs: 20_000,
			lookbackMs: 3_600_000,
			limit: 100,
		};
		const first = await reconcileVercelSource(
			db,
			source,
			options,
			async () => ({ intakes: [], saturated: true }),
		);
		cursorIds.push(first.id);
		expect(first.status).toBe("deferred");
		expect(
			(
				await db.reliabilityCursor.findUniqueOrThrow({
					where: { id: first.id },
				})
			).watermark,
		).toBeNull();
		clock = new Date("2026-09-09T12:01:01Z");
		const windows: string[][] = [];
		const resumed = await reconcileVercelSource(
			db,
			source,
			{ ...options, maxQueries: 2 },
			async (window) => {
				windows.push([window.since.toISOString(), window.until.toISOString()]);
				return { intakes: [], saturated: false };
			},
		);
		expect(resumed.status).toBe("complete");
		expect(windows).toEqual([
			["2026-09-09T11:00:00.000Z", "2026-09-09T11:30:00.000Z"],
			["2026-09-09T11:30:00.000Z", "2026-09-09T12:00:00.000Z"],
		]);
		expect(
			(
				await db.reliabilityCursor.findUniqueOrThrow({
					where: { id: first.id },
				})
			).watermark?.toISOString(),
		).toBe("2026-09-09T12:00:00.000Z");
	});
	it("deduplicates signed deployment failure deliveries by deployment identity", async () => {
		const clock = new Date("2026-09-09T12:00:00Z");
		const registration = {
			secret: "deployment-db-fixture",
			account: "vercel-deployment-test",
			project: "web",
			operation: "sales.save",
			service: {
				...service,
				sources: [
					{
						provider: "vercel" as const,
						account: "vercel-deployment-test",
						project: "web",
					},
				],
			},
		};
		for (const id of ["delivery-one", "delivery-two", "delivery-one"]) {
			const body = JSON.stringify({
				id,
				type: "deployment.error",
				createdAt: clock.toISOString(),
				payload: {
					team: { id: registration.account },
					project: { id: registration.project },
					target: "production",
					deployment: { id: "dpl_failedfixture" },
				},
			});
			const response = await handleVercelDeploymentRequest(
				new Request("https://api.example/deployments", {
					method: "POST",
					body,
					headers: {
						"content-type": "application/json",
						"x-vercel-signature": createHmac("sha1", registration.secret)
							.update(body)
							.digest("hex"),
					},
				}),
				{
					registration,
					now: () => clock,
					persist: (intake) => ingestReliabilityOccurrence(db, intake),
				},
			);
			expect(response.status).toBe(200);
		}
		const incidents = await db.reliabilityIncident.findMany({
			where: {
				serviceId: service.id,
				occurrences: { some: { account: registration.account } },
			},
			include: { occurrences: true, deliveries: true },
		});
		expect(incidents).toHaveLength(1);
		expect(incidents[0]?.occurrenceCount).toBe(1);
		expect(incidents[0]?.deliveries).toHaveLength(2);
		expect(incidents[0]?.occurrences[0]?.evidence).toEqual({
			deploymentId: "dpl_failedfixture",
		});
	});
	it("replays a partially persisted Vercel batch without duplicate occurrences or intents", async () => {
		const clock = new Date("2026-09-09T12:00:00Z");
		const registration = {
			secret: "local-vercel-fixture",
			format: "json" as const,
			account: "vercel-replay",
			project: "web",
			operation: "sales.save",
			service: {
				...service,
				sources: [
					{
						provider: "vercel" as const,
						account: "vercel-replay",
						project: "web",
					},
				],
			},
		};
		const body = JSON.stringify(
			["vercel-first", "vercel-second"].map((id) => ({
				id,
				deploymentId: "dpl_fixture",
				projectId: "web",
				environment: "production",
				source: "lambda",
				level: "error",
				timestamp: clock.getTime(),
				message: "private raw message",
			})),
		);
		const request = () =>
			new Request("https://api.example/api/webhooks/reliability/vercel/web", {
				method: "POST",
				body,
				headers: {
					"content-type": "application/json",
					"x-vercel-signature": createHmac("sha1", registration.secret)
						.update(body)
						.digest("hex"),
				},
			});
		let attempts = 0;
		const first = await handleVercelDrainRequest(request(), {
			registration,
			now: () => clock,
			persist: async (intake) => {
				attempts++;
				if (attempts === 2) throw new Error("Simulated storage outage");
				return ingestReliabilityOccurrence(db, intake);
			},
		});
		expect(first.status).toBe(503);
		const count = () =>
			db.reliabilityOccurrence.count({
				where: {
					account: "vercel-replay",
					incident: { serviceId: service.id },
				},
			});
		expect(await count()).toBe(1);
		for (let retry = 0; retry < 2; retry++) {
			const response = await handleVercelDrainRequest(request(), {
				registration,
				now: () => clock,
				persist: (intake) => ingestReliabilityOccurrence(db, intake),
			});
			expect(response.status).toBe(200);
		}
		expect(await count()).toBe(2);
		const incidents = await db.reliabilityIncident.findMany({
			where: {
				serviceId: service.id,
				occurrences: { some: { account: "vercel-replay" } },
			},
			include: { deliveries: true, occurrences: true },
		});
		expect(incidents).toHaveLength(2);
		for (const incident of incidents) {
			expect(incident.occurrenceCount).toBe(1);
			expect(incident.deliveries).toHaveLength(2);
			expect(incident.occurrences[0]?.evidence).toEqual({
				deploymentId: "dpl_fixture",
			});
		}
		expect(JSON.stringify(incidents)).not.toContain("private raw message");
	});
	it("replays Trigger historical discovery independently and deduplicates old failures", async () => {
		const source = {
			token: "tr_prod_sk_fixture",
			account: "trigger-history",
			project: "jobs",
			environmentId: "env-prod",
			fallbackOperation: "sales.save",
			operations: [],
			service: {
				...service,
				sources: [
					{
						provider: "trigger" as const,
						account: "trigger-history",
						project: "jobs",
					},
				],
			},
		};
		let clock = new Date("2026-09-09T12:00:00Z");
		const options = {
			now: () => clock,
			maxPages: 2,
			maxWatches: 10,
			maxDurationMs: 20_000,
			lookbackMs: 7 * 86_400_000,
			mode: "historical" as const,
		};
		const starts: string[] = [];
		const read = async (url: URL) => {
			expect(url.pathname).toBe("/api/v1/runs");
			starts.push(url.searchParams.get("filter[createdAt][from]") ?? "");
			return Response.json({
				data: [
					{
						id: "run_historical",
						taskIdentifier: "save-sale",
						status: "FAILED",
						isTest: false,
						env: { id: "env-prod" },
						createdAt: "2026-09-05T11:00:00Z",
						updatedAt: "2026-09-05T11:05:00Z",
					},
				],
				pagination: {},
			});
		};
		const first = await reconcileTriggerSource(db, source, options, read);
		cursorIds.push(first.id);
		expect(first.status).toBe("complete");
		clock = new Date("2026-09-09T13:00:00Z");
		const second = await reconcileTriggerSource(db, source, options, read);
		expect(second.status).toBe("complete");
		expect(second.id).toBe(first.id);
		expect(starts).toEqual([
			String(Date.parse("2026-09-02T12:00:00Z")),
			String(Date.parse("2026-09-02T13:00:00Z")),
		]);
		expect(
			await db.reliabilityOccurrence.count({
				where: {
					incident: { serviceId: service.id },
					providerGroupId: "run_historical",
				},
			}),
		).toBe(1);
		const incremental = await reconcileTriggerSource(
			db,
			source,
			{ ...options, mode: "incremental", lookbackMs: 86_400_000 },
			async () => Response.json({ data: [], pagination: {} }),
		);
		cursorIds.push(incremental.id);
		expect(incremental.id).not.toBe(first.id);
		expect(incremental.status).toBe("complete");
	});
	it("reports stale discovery and unchecked watches even when the cursor recently succeeded", async () => {
		const source = {
			account: "trigger-health",
			project: "jobs",
			environmentId: "env-prod",
			fallbackOperation: "sales.save",
			operations: [],
			service: {
				...service,
				sources: [
					{
						provider: "trigger" as const,
						account: "trigger-health",
						project: "jobs",
					},
				],
			},
		};
		const clock = new Date("2026-09-09T12:00:00Z");
		const id = createHash("sha256")
			.update(`${service.id}-health`)
			.digest("hex");
		cursorIds.push(id);
		const query = { cursorId: id, now: clock, maxAgeMs: 900_000 };
		expect(
			(await getTriggerReconciliationHealth(db, source, query)).reasons,
		).toContain("DISCOVERY_NEVER_COMPLETED");
		await db.reliabilityCursor.create({
			data: {
				id,
				watermark: new Date(clock.getTime() - 3_600_000),
				lastSuccessAt: clock,
			},
		});
		const run = prepareTriggerRun(
			{
				id: "run_health",
				taskIdentifier: "save-sale",
				status: "EXECUTING",
				isTest: false,
				env: { id: "env-prod" },
				createdAt: "2026-09-09T10:00:00Z",
				updatedAt: "2026-09-09T10:00:00Z",
			},
			source,
			clock,
			{ discovery: true },
		);
		await recordTriggerRunObservation(
			db,
			run,
			new Date(clock.getTime() - 3_600_000),
		);
		// A failed lookup can postpone retries, but must not make the watch fresh.
		await db.reliabilityRunWatch.update({
			where: { watchKey: run.watchKey },
			data: { nextCheckAt: new Date(clock.getTime() + 300_000) },
		});
		const stale = await getTriggerReconciliationHealth(db, source, query);
		expect(stale.status).toBe("stale");
		expect(stale.reasons).toEqual(["DISCOVERY_BEHIND", "WATCHES_STALE"]);
		expect(stale.staleWatches).toBe(1);
		await db.reliabilityCursor.update({
			where: { id },
			data: { watermark: clock },
		});
		await recordTriggerRunObservation(db, run, clock);
		expect(
			(await getTriggerReconciliationHealth(db, source, query)).status,
		).toBe("healthy");
	});
	it("reserves discovery time while unfinished Trigger watches remain due", async () => {
		const source = {
			token: "tr_prod_sk_fixture",
			account: "trigger-fairness",
			project: "jobs",
			environmentId: "env-prod",
			fallbackOperation: "sales.save",
			operations: [],
			service: {
				...service,
				sources: [
					{
						provider: "trigger" as const,
						account: "trigger-fairness",
						project: "jobs",
					},
				],
			},
		};
		const started = Date.parse("2026-09-09T12:00:00Z");
		let elapsed = 0;
		const now = () => new Date(started + elapsed);
		const run = (id: string) => ({
			id,
			taskIdentifier: "save-sale",
			status: "EXECUTING",
			isTest: false,
			env: { id: "env-prod" },
			createdAt: "2026-09-09T11:00:00Z",
			updatedAt: "2026-09-09T11:00:00Z",
		});
		for (const id of [
			"run_fairone",
			"run_fairtwo",
			"run_fairthree",
			"run_fairfour",
		]) {
			await recordTriggerRunObservation(
				db,
				prepareTriggerRun(run(id), source, now(), { discovery: true }),
				new Date(started - 600_000),
			);
		}
		let reads = 0;
		let discovery = 0;
		const result = await reconcileTriggerSource(
			db,
			source,
			{
				now,
				maxPages: 2,
				maxWatches: 10,
				maxDurationMs: 20_000,
				lookbackMs: 86_400_000,
			},
			async (url) => {
				if (url.pathname.startsWith("/api/v3/runs/")) {
					reads++;
					elapsed += 5000;
					return Response.json(run(url.pathname.slice("/api/v3/runs/".length)));
				}
				discovery++;
				return Response.json({ data: [], pagination: {} });
			},
		);
		cursorIds.push(result.id);
		expect(result.status).toBe("complete");
		expect(reads).toBe(2);
		expect(discovery).toBe(1);
		expect(
			await getDueTriggerWatches(db, source, { now: now(), limit: 10 }),
		).toHaveLength(2);
	});
	it("resumes Trigger pagination after rate limiting without advancing the discovery window", async () => {
		const source = {
			token: "tr_prod_sk_fixture",
			account: "trigger-recovery",
			project: "jobs",
			environmentId: "env-prod",
			fallbackOperation: "sales.save",
			operations: [],
			service: {
				...service,
				sources: [
					{
						provider: "trigger" as const,
						account: "trigger-recovery",
						project: "jobs",
					},
				],
			},
		};
		let clock = new Date("2026-09-09T12:00:00Z");
		const options = {
			now: () => clock,
			maxPages: 3,
			maxWatches: 10,
			maxDurationMs: 20_000,
			lookbackMs: 86_400_000,
		};
		let calls = 0;
		const first = await reconcileTriggerSource(
			db,
			source,
			options,
			async () => {
				calls++;
				if (calls === 1)
					return Response.json({
						data: [
							{
								id: "run_recovery",
								taskIdentifier: "save-sale",
								status: "FAILED",
								isTest: false,
								env: { id: "env-prod" },
								createdAt: "2026-09-09T11:00:00Z",
								updatedAt: "2026-09-09T11:01:00Z",
							},
						],
						pagination: { next: "run_nextpage" },
					});
				return new Response(null, {
					status: 429,
					headers: { "Retry-After": "120" },
				});
			},
		);
		cursorIds.push(first.id);
		expect(first.status).toBe("deferred");
		expect(first.pages).toBe(1);
		const saved = await db.reliabilityCursor.findUniqueOrThrow({
			where: { id: first.id },
		});
		expect(saved.watermark).toBeNull();
		expect(saved.checkpoint).toMatchObject({
			cursor: "run_nextpage",
			page: 1,
			windowEnd: clock.toISOString(),
		});
		clock = new Date("2026-09-09T12:01:00Z");
		const busy = await reconcileTriggerSource(db, source, options, async () => {
			calls++;
			throw new Error("Must not request during cooldown");
		});
		expect(busy.status).toBe("busy");
		expect(calls).toBe(2);
		clock = new Date("2026-09-09T12:02:01Z");
		const resumed = await reconcileTriggerSource(
			db,
			source,
			options,
			async (url) => {
				expect(url.searchParams.get("page[after]")).toBe("run_nextpage");
				expect(url.searchParams.get("filter[createdAt][to]")).toBe(
					String(Date.parse("2026-09-09T12:00:00Z")),
				);
				return Response.json({ data: [], pagination: {} });
			},
		);
		expect(resumed.status).toBe("complete");
		expect(
			(
				await db.reliabilityCursor.findUniqueOrThrow({
					where: { id: first.id },
				})
			).watermark?.toISOString(),
		).toBe("2026-09-09T12:00:00.000Z");
		expect(
			await db.reliabilityOccurrence.count({
				where: {
					incident: { serviceId: service.id },
					providerGroupId: "run_recovery",
				},
			}),
		).toBe(1);
	});
	it("reconciles watched Trigger failures outside the discovery window and survives unavailable runs", async () => {
		const source = {
			token: "tr_prod_sk_fixture",
			account: "trigger-account",
			project: "trigger-project",
			environmentId: "env-prod",
			fallbackOperation: "sales.save",
			operations: [],
			service: {
				...service,
				sources: [
					{
						provider: "trigger" as const,
						account: "trigger-account",
						project: "trigger-project",
					},
				],
			},
		};
		let clock = new Date("2026-09-09T12:00:00Z");
		const run = (id: string) => ({
			id,
			taskIdentifier: "save-sale",
			status: "EXECUTING",
			isTest: false,
			env: { id: "env-prod" },
			createdAt: "2026-09-09T11:00:00Z",
			updatedAt: "2026-09-09T11:00:00Z",
		});
		const options = {
			now: () => clock,
			maxPages: 2,
			maxWatches: 10,
			maxDurationMs: 20_000,
			lookbackMs: 86_400_000,
		};
		const first = await reconcileTriggerSource(db, source, options, async () =>
			Response.json({
				data: [run("run_unavailable"), run("run_latefailure")],
				pagination: {},
			}),
		);
		cursorIds.push(first.id);
		expect(first.status).toBe("complete");
		clock = new Date("2026-09-11T12:00:00Z");
		const requests: string[] = [];
		const second = await reconcileTriggerSource(
			db,
			source,
			options,
			async (url) => {
				requests.push(url.pathname);
				if (url.pathname.endsWith("run_unavailable"))
					return new Response(null, { status: 404 });
				if (url.pathname.endsWith("run_latefailure"))
					return Response.json({
						...run("run_latefailure"),
						status: "CRASHED",
						updatedAt: clock.toISOString(),
					});
				return Response.json({ data: [], pagination: {} });
			},
		);
		expect(second.status).toBe("attention_required");
		expect(requests.at(-1)).toBe("/api/v1/runs");
		const watches = await db.reliabilityRunWatch.findMany({
			where: { serviceId: service.id, account: source.account },
		});
		expect(
			watches.find((watch) => watch.runId === "run_latefailure")?.terminal,
		).toBe(true);
		const unavailable = watches.find(
			(watch) => watch.runId === "run_unavailable",
		);
		expect(unavailable?.terminal).toBe(false);
		expect(unavailable?.nextCheckAt.getTime()).toBeGreaterThan(clock.getTime());
		expect(
			await db.reliabilityOccurrence.count({
				where: {
					incident: { serviceId: service.id },
					providerGroupId: "run_latefailure",
				},
			}),
		).toBe(1);
	});
	it("keeps old Trigger runs discoverable until terminal evidence is durably ingested", async () => {
		const triggerService = {
			...service,
			sources: [
				{
					provider: "trigger" as const,
					account: "trigger-test",
					project: "trigger-project",
				},
			],
		};
		const source = {
			account: "trigger-test",
			project: "trigger-project",
			environmentId: "env-prod",
			fallbackOperation: "sales.save",
			operations: [],
			service: triggerService,
		};
		const run = {
			id: `run_${service.id}`,
			taskIdentifier: "save-sale",
			status: "EXECUTING",
			isTest: false,
			env: { id: "env-prod" },
			createdAt: "2026-09-07T10:00:00Z",
			updatedAt: "2026-09-08T10:00:00Z",
		};
		const pending = prepareTriggerRun(run, source, now, { discovery: true });
		await recordTriggerRunObservation(db, pending, now);
		const due = await getDueTriggerWatches(db, source, {
			now: new Date(now.getTime() + 300_000),
			limit: 10,
		});
		expect(due.map((entry) => entry.runId)).toContain(run.id);
		const failed = prepareTriggerRun(
			{
				...run,
				status: "CRASHED",
				updatedAt: now.toISOString(),
				finishedAt: now.toISOString(),
			},
			source,
			now,
			{ expectedRunId: run.id },
		);
		await recordTriggerRunObservation(db, failed, now);
		await recordTriggerRunObservation(
			db,
			pending,
			new Date(now.getTime() + 1000),
		);
		expect(
			(
				await db.reliabilityRunWatch.findUnique({
					where: { watchKey: pending.watchKey },
				})
			)?.providerStatus,
		).toBe("CRASHED");
		expect(
			await getDueTriggerWatches(db, source, {
				now: new Date(now.getTime() + 300_000),
				limit: 10,
			}),
		).toHaveLength(0);
		if (!failed.intake) throw new Error("Expected terminal failure intake");
		expect(
			(await getReliabilityIncident(db, failed.intake.incident.problemKey))
				?.occurrenceCount,
		).toBe(1);
	});
	it("revisits the historical window after completion while deduplicating delayed events", async () => {
		let clock = new Date(Date.now());
		const source = {
			account: "test-account",
			projectId: "test-project",
			apiOrigin: "https://sentry.io",
			token: "local-history-token",
			operation: "sales.save",
			service,
		};
		const occurredAt = new Date(clock.getTime() - 2 * 86_400_000).toISOString();
		const options = {
			now: () => clock,
			maxPages: 2,
			maxDurationMs: 10_000,
			lookbackMs: 7 * 86_400_000,
			mode: "historical" as const,
		};
		const request = async (url: URL) => {
			expect(url.searchParams.get("start")).toBe(
				new Date(clock.getTime() - options.lookbackMs).toISOString(),
			);
			return Response.json(
				[
					{
						eventID: `${service.id}-history`,
						groupID: `${service.id}-history`,
						projectID: source.projectId,
						dateCreated: occurredAt,
						tags: [{ key: "environment", value: "production" }],
					},
				],
				{
					headers: {
						link: '<https://sentry.io/api/0/projects/test-account/test-project/events/?cursor=0:0:0>; rel="next"; results="false"',
					},
				},
			);
		};
		const first = await reconcileSentrySource(db, source, options, request);
		cursorIds.push(first.id);
		expect(first.status).toBe("complete");
		clock = new Date(clock.getTime() + 86_400_000);
		const repeated = await reconcileSentrySource(db, source, options, request);
		expect(repeated.status).toBe("complete");
		expect(
			await db.reliabilityOccurrence.count({
				where: {
					incident: { serviceId: service.id },
					providerEventId: `${service.id}-history`,
				},
			}),
		).toBe(1);
	});
	it("retries failed Sentry pages without losing the fixed discovery window", async () => {
		let clock = new Date(Date.now());
		const source = {
			account: "test-account",
			projectId: "test-project",
			apiOrigin: "https://sentry.io",
			token: "local-test-read-token",
			operation: "sales.save",
			service,
		};
		const options = {
			now: () => clock,
			maxPages: 2,
			maxDurationMs: 10_000,
			lookbackMs: 86_400_000,
		};
		const occurredAt = new Date(clock.getTime() - 1000).toISOString();
		const first = await reconcileSentrySource(
			db,
			source,
			options,
			async (url) => {
				if (url.searchParams.has("cursor"))
					return new Response(null, {
						status: 429,
						headers: { "retry-after": "60" },
					});
				return Response.json(
					[
						{
							eventID: `${service.id}-poll`,
							groupID: `${service.id}-poll`,
							projectID: source.projectId,
							dateCreated: occurredAt,
							tags: [{ key: "environment", value: "production" }],
						},
					],
					{
						headers: {
							link: '<https://sentry.io/api/0/projects/test-account/test-project/events/?cursor=0:100:0>; rel="next"; results="true"',
						},
					},
				);
			},
		);
		cursorIds.push(first.id);
		expect(first.status).toBe("deferred");
		expect(first.pages).toBe(1);
		expect(
			await db.reliabilityOccurrence.count({
				where: {
					incident: { serviceId: service.id },
					providerEventId: `${service.id}-poll`,
				},
			}),
		).toBe(1);
		expect(
			(await db.reliabilityCursor.findUnique({ where: { id: first.id } }))
				?.watermark,
		).toBeNull();
		const originalEnd = clock.toISOString();
		clock = new Date(clock.getTime() + 60_000);
		const second = await reconcileSentrySource(
			db,
			source,
			options,
			async (url) => {
				expect(url.searchParams.get("cursor")).toBe("0:100:0");
				expect(url.searchParams.get("end")).toBe(originalEnd);
				return Response.json([], {
					headers: {
						link: '<https://sentry.io/api/0/projects/test-account/test-project/events/?cursor=0:100:0>; rel="next"; results="false"',
					},
				});
			},
		);
		expect(second.status).toBe("complete");
		expect(
			(
				await db.reliabilityCursor.findUnique({ where: { id: first.id } })
			)?.watermark?.toISOString(),
		).toBe(originalEnd);
		const bounded = await reconcileSentrySource(
			db,
			source,
			{ ...options, maxPages: 1 },
			async () =>
				Response.json([], {
					headers: {
						link: '<https://sentry.io/api/0/projects/test-account/test-project/events/?cursor=0:100:0>; rel="next"; results="true"',
					},
				}),
		);
		expect(bounded.status).toBe("deferred");
		expect(bounded.pages).toBe(1);
	});
	it("resumes partial discovery without advancing the watermark or accepting a stale worker", async () => {
		const clock = new Date(Date.now());
		const input = {
			id: cursorId,
			now: clock,
			leaseMs: 1000,
			initialWindowStart: new Date(clock.getTime() - 86_400_000),
			overlapMs: 300_000,
		};
		const claims = await Promise.all(
			Array.from({ length: 3 }, () => claimReliabilityCursor(db, input)),
		);
		const active = claims.filter((entry) => entry !== null);
		expect(active).toHaveLength(1);
		const first = active[0];
		if (!first?.leaseId) throw new Error("Expected cursor lease");
		expect(
			await recordReliabilityCursorPage(db, {
				id: cursorId,
				leaseId: first.leaseId,
				now: clock,
				expectedPage: 0,
				nextCursor: "page-2",
			}),
		).toBe(true);
		expect(
			(await db.reliabilityCursor.findUnique({ where: { id: cursorId } }))
				?.watermark,
		).toBeNull();
		const later = new Date(clock.getTime() + 1001);
		const resumed = await claimReliabilityCursor(db, { ...input, now: later });
		if (!resumed?.leaseId) throw new Error("Expected resumed cursor lease");
		expect(resumed.checkpoint.cursor).toBe("page-2");
		expect(resumed.checkpoint.windowEnd).toBe(clock.toISOString());
		expect(
			await recordReliabilityCursorPage(db, {
				id: cursorId,
				leaseId: first.leaseId,
				now: later,
				expectedPage: 1,
				nextCursor: null,
			}),
		).toBe(false);
		expect(
			await recordReliabilityCursorPage(db, {
				id: cursorId,
				leaseId: resumed.leaseId,
				now: later,
				expectedPage: 0,
				nextCursor: null,
			}),
		).toBe(false);
		expect(
			await recordReliabilityCursorPage(db, {
				id: cursorId,
				leaseId: resumed.leaseId,
				now: later,
				expectedPage: 1,
				nextCursor: null,
			}),
		).toBe(true);
		const completed = await db.reliabilityCursor.findUnique({
			where: { id: cursorId },
		});
		expect(completed?.watermark?.toISOString()).toBe(clock.toISOString());
		expect(completed?.checkpoint).toBeNull();
		const next = await claimReliabilityCursor(db, { ...input, now: later });
		if (!next?.leaseId) throw new Error("Expected next polling window");
		expect(next.checkpoint.windowStart).toBe(
			new Date(clock.getTime() - input.overlapMs).toISOString(),
		);
		const retryAt = new Date(later.getTime() + 30_000);
		expect(
			await deferReliabilityCursor(db, {
				id: cursorId,
				leaseId: next.leaseId,
				now: later,
				retryAt,
				errorCode: "RATE_LIMITED",
			}),
		).toBe(true);
		expect(
			await claimReliabilityCursor(db, { ...input, now: later }),
		).toBeNull();
		expect(
			await recordReliabilityCursorPage(db, {
				id: cursorId,
				leaseId: next.leaseId,
				now: later,
				expectedPage: 0,
				nextCursor: null,
			}),
		).toBe(false);
		expect(
			(await claimReliabilityCursor(db, { ...input, now: retryAt }))?.checkpoint
				.windowEnd,
		).toBe(later.toISOString());
	});
	it("persists repeated signed Sentry alerts once across provider intake and delivery intents", async () => {
		const registration = {
			clientSecret: "local-fixture-secret",
			installationId: "fixture-installation",
			account: "test-account",
			projectId: "test-project",
			operation: "sales.save",
			service,
		};
		const rawBody = Buffer.from(
			JSON.stringify({
				action: "triggered",
				installation: { uuid: registration.installationId },
				data: {
					event: {
						project: registration.projectId,
						event_id: `${service.id}-signed`,
						issue_id: `${service.id}-signed`,
						datetime: "2026-09-09T11:00:00.123456Z",
						environment: "production",
					},
				},
			}),
		);
		const request = {
			rawBody,
			signature: createHmac("sha256", registration.clientSecret)
				.update(rawBody)
				.digest("hex"),
			resource: "event_alert",
		};
		const intake = prepareSentryAlert(request, registration, now);
		await Promise.all(
			Array.from({ length: 3 }, () =>
				ingestReliabilityOccurrence(
					db,
					prepareSentryAlert(request, registration, now),
				),
			),
		);
		const saved = await getReliabilityIncident(db, intake.incident.problemKey);
		expect(saved?.occurrenceCount).toBe(1);
		expect(saved?.occurrences).toHaveLength(1);
		expect(saved?.deliveries).toHaveLength(2);
	});
	it("authorizes actions by incident service and commits one audit and outbound revision", async () => {
		const first = event("action", { groupId: `${service.id}-action` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		const command = {
			incidentId: incident.id,
			requestId: "action-1",
			expectedRevision: incident.revision,
			action: "ACKNOWLEDGE" as const,
		};
		const principal = {
			actorId: "user:test-responder",
			serviceIds: [service.id],
		};
		await expect(
			applyReliabilityAction(db, command, {
				...principal,
				serviceIds: ["another-service"],
			}),
		).rejects.toThrow("Unauthorized reliability action");
		expect(
			(await getReliabilityIncident(db, first.incident.problemKey))?.revision,
		).toBe(1);
		const results = await Promise.all(
			Array.from({ length: 3 }, () =>
				applyReliabilityAction(db, command, principal),
			),
		);
		expect(results.filter((result) => !result.duplicate)).toHaveLength(1);
		const saved = await getReliabilityIncident(db, first.incident.problemKey);
		expect(saved?.revision).toBe(2);
		expect(saved?.status).toBe("NEEDS_INVESTIGATION");
		expect(
			saved?.transitions.filter((entry) => entry.action === "ACKNOWLEDGE"),
		).toHaveLength(1);
		expect(
			saved?.deliveries.filter((entry) => entry.revision === 2),
		).toHaveLength(2);
		await expect(
			applyReliabilityAction(
				db,
				{ ...command, requestId: "stale-action", action: "ASSIGN_SELF" },
				principal,
			),
		).rejects.toThrow("Stale reliability revision");
		await expect(
			applyReliabilityAction(
				db,
				{ ...command, action: "ASSIGN_SELF" },
				principal,
			),
		).rejects.toThrow("Reliability action identity conflict");
		await expect(
			applyReliabilityAction(db, command, {
				...principal,
				actorId: "user:another-responder",
			}),
		).rejects.toThrow("Reliability action identity conflict");
		await applyReliabilityAction(
			db,
			{
				...command,
				requestId: "assign-action",
				expectedRevision: 2,
				action: "ASSIGN_SELF",
			},
			principal,
		);
		expect(
			(await getReliabilityIncident(db, first.incident.problemKey))?.owner,
		).toBe(principal.actorId);
	});
	it("rejects human triage actions on informational incidents without advancing state", async () => {
		const first = event("info-action", {
			groupId: `${service.id}-info-action`,
			impact: "expected",
		});
		const { incident } = await ingestReliabilityOccurrence(db, first);
		await expect(
			applyReliabilityAction(
				db,
				{
					incidentId: incident.id,
					requestId: "info-ack",
					expectedRevision: 1,
					action: "ACKNOWLEDGE",
				},
				{ actorId: "user:test-responder", serviceIds: [service.id] },
			),
		).rejects.toThrow("Reliability action not allowed in current state");
		const saved = await getReliabilityIncident(db, first.incident.problemKey);
		expect(saved?.revision).toBe(1);
		expect(saved?.deliveries).toHaveLength(0);
		expect(saved?.transitions).toHaveLength(1);
	});
	it("stops after five failed attempts even when fresh evidence creates new revisions", async () => {
		const first = event("budget", { groupId: `${service.id}-budget` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		let clock = new Date(Date.now() + 1000);
		for (let attempt = 0; attempt < 5; attempt++) {
			const claim = await claimReliabilityDelivery(db, {
				incidentId: incident.id,
				destination: "GITHUB",
				now: clock,
				leaseMs: 1000,
			});
			if (!claim?.leaseId) throw new Error("Expected delivery claim");
			const retryAt = new Date(clock.getTime() + 1000);
			await settleReliabilityDelivery(db, {
				deliveryId: claim.id,
				leaseId: claim.leaseId,
				now: clock,
				outcome: { status: "PENDING", errorCode: "RATE_LIMITED", retryAt },
			});
			clock = retryAt;
			await ingestReliabilityOccurrence(
				db,
				event(`budget-update-${attempt}`, { groupId: `${service.id}-budget` }),
			);
		}
		expect(
			await claimReliabilityDelivery(db, {
				incidentId: incident.id,
				destination: "GITHUB",
				now: clock,
				leaseMs: 1000,
			}),
		).toBeNull();
		expect(
			(
				await getReliabilityIncident(db, first.incident.problemKey)
			)?.deliveries.some(
				(delivery) =>
					delivery.destination === "GITHUB" && delivery.status === "FAILED",
			),
		).toBe(true);
	});
	it("exposes uncertainty and pending backlog separately for integration health", async () => {
		const first = event("health", { groupId: `${service.id}-health` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		const clock = new Date(Date.now() + 1000);
		const claim = await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "GITHUB",
			now: clock,
			leaseMs: 1000,
		});
		if (!claim?.leaseId) throw new Error("Expected delivery claim");
		await settleReliabilityDelivery(db, {
			deliveryId: claim.id,
			leaseId: claim.leaseId,
			now: clock,
			outcome: { status: "UNCERTAIN", errorCode: "RESPONSE_LOST" },
		});
		const health = await getReliabilityDeliveryHealth(db, {
			serviceId: service.id,
			now: clock,
		});
		expect(
			health.counts.find(
				(row) => row.destination === "GITHUB" && row.status === "UNCERTAIN",
			)?.count,
		).toBe(1);
		expect(health.oldestPendingAt).not.toBeNull();
	});
	it("recovers an uncertain remote create only with the matching delivery marker", async () => {
		const first = event("recover", { groupId: `${service.id}-recover` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		const clock = new Date(Date.now() + 1000);
		const claim = await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "GITHUB",
			now: clock,
			leaseMs: 1000,
		});
		if (!claim?.leaseId) throw new Error("Expected delivery claim");
		const later = new Date(clock.getTime() + 2000);
		expect(
			await settleReliabilityDelivery(db, {
				deliveryId: claim.id,
				leaseId: claim.leaseId,
				now: later,
				outcome: { status: "SENT", remoteId: "42" },
			}),
		).toBe(false);
		await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "GITHUB",
			now: later,
			leaseMs: 1000,
		});
		expect(
			await recordReliabilityDeliveryReceipt(db, {
				deliveryId: claim.id,
				actionKey: "wrong-marker",
				remoteId: "42",
				now: later,
			}),
		).toBe(false);
		expect(
			await recordReliabilityDeliveryReceipt(db, {
				deliveryId: claim.id,
				actionKey: claim.actionKey,
				remoteId: "42",
				now: later,
			}),
		).toBe(true);
		await ingestReliabilityOccurrence(
			db,
			event("recover-update", { groupId: `${service.id}-recover` }),
		);
		expect(
			(
				await claimReliabilityDelivery(db, {
					incidentId: incident.id,
					destination: "GITHUB",
					now: later,
					leaseMs: 1000,
				})
			)?.remoteId,
		).toBe("42");
	});
	it("preserves a provider retry delay even when newer evidence arrives", async () => {
		const first = event("retry", { groupId: `${service.id}-retry` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		const clock = new Date(Date.now() + 1000);
		const claim = await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "SLACK",
			now: clock,
			leaseMs: 30_000,
		});
		if (!claim?.leaseId) throw new Error("Expected delivery claim");
		const retryAt = new Date(clock.getTime() + 60_000);
		await settleReliabilityDelivery(db, {
			deliveryId: claim.id,
			leaseId: claim.leaseId,
			now: clock,
			outcome: { status: "PENDING", errorCode: "RATE_LIMITED", retryAt },
		});
		await ingestReliabilityOccurrence(
			db,
			event("retry-new", { groupId: `${service.id}-retry` }),
		);
		expect(
			await claimReliabilityDelivery(db, {
				incidentId: incident.id,
				destination: "SLACK",
				now: clock,
				leaseMs: 30_000,
			}),
		).toBeNull();
		expect(
			(
				await claimReliabilityDelivery(db, {
					incidentId: incident.id,
					destination: "SLACK",
					now: retryAt,
					leaseMs: 30_000,
				})
			)?.revision,
		).toBe(2);
	});
	it("retains the remote ticket identity for subsequent revisions and rejects a stale lease owner", async () => {
		const first = event("receipt", { groupId: `${service.id}-receipt` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		const clock = new Date(Date.now() + 1000);
		const claim = await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "GITHUB",
			now: clock,
			leaseMs: 30_000,
		});
		if (!claim?.leaseId) throw new Error("Expected delivery claim");
		expect(
			await settleReliabilityDelivery(db, {
				deliveryId: claim.id,
				leaseId: "wrong-owner",
				now: clock,
				outcome: { status: "SENT", remoteId: "42" },
			}),
		).toBe(false);
		expect(
			await settleReliabilityDelivery(db, {
				deliveryId: claim.id,
				leaseId: claim.leaseId,
				now: clock,
				outcome: { status: "SENT", remoteId: "42" },
			}),
		).toBe(true);
		await ingestReliabilityOccurrence(
			db,
			event("receipt-update", { groupId: `${service.id}-receipt` }),
		);
		const update = await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "GITHUB",
			now: clock,
			leaseMs: 30_000,
		});
		expect(update?.remoteId).toBe("42");
	});
	it("holds a crashed sender as uncertain instead of creating again after lease expiry", async () => {
		const first = event("crash", { groupId: `${service.id}-crash` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		const clock = new Date(Date.now() + 1000);
		await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "GITHUB",
			now: clock,
			leaseMs: 1000,
		});
		const afterExpiry = new Date(clock.getTime() + 1001);
		expect(
			await claimReliabilityDelivery(db, {
				incidentId: incident.id,
				destination: "GITHUB",
				now: afterExpiry,
				leaseMs: 1000,
			}),
		).toBeNull();
		expect(
			(
				await getReliabilityIncident(db, first.incident.problemKey)
			)?.deliveries.find((delivery) => delivery.destination === "GITHUB")
				?.status,
		).toBe("UNCERTAIN");
	});
	it("allows only one worker to claim an incident destination across competing revisions", async () => {
		const first = event("delivery-1", { groupId: `${service.id}-delivery` });
		const { incident } = await ingestReliabilityOccurrence(db, first);
		await ingestReliabilityOccurrence(
			db,
			event("delivery-2", { groupId: `${service.id}-delivery` }),
		);
		const claims = await Promise.all(
			Array.from({ length: 4 }, () =>
				claimReliabilityDelivery(db, {
					incidentId: incident.id,
					destination: "GITHUB",
					now: new Date(Date.now() + 1000),
					leaseMs: 30_000,
				}),
			),
		);
		const claimed = claims.filter((claim) => claim !== null);
		expect(claimed).toHaveLength(1);
		expect(claimed[0]?.revision).toBe(2);
		const saved = await getReliabilityIncident(db, first.incident.problemKey);
		expect(
			saved?.deliveries
				.filter((delivery) => delivery.destination === "GITHUB")
				.map((delivery) => delivery.status)
				.sort(),
		).toEqual(["SENDING", "SUPPRESSED"]);
	});
	it("accepts concurrent redelivery once and persists one pair of outbound intents", async () => {
		const intake = event("first");
		await Promise.all(
			Array.from({ length: 4 }, () => ingestReliabilityOccurrence(db, intake)),
		);
		const incident = await getReliabilityIncident(
			db,
			intake.incident.problemKey,
		);
		expect(incident?.occurrenceCount).toBe(1);
		expect(incident?.occurrences).toHaveLength(1);
		expect(incident?.deliveries).toHaveLength(2);
		expect(incident?.revision).toBe(1);
	});
	it("activates a previously informational problem when a later occurrence blocks the workflow", async () => {
		const first = event("expected", {
			groupId: `${service.id}-expected`,
			impact: "expected",
		});
		await ingestReliabilityOccurrence(db, first);
		expect(
			(await getReliabilityIncident(db, first.incident.problemKey))?.deliveries,
		).toHaveLength(0);
		await ingestReliabilityOccurrence(
			db,
			event("blocked", {
				groupId: `${service.id}-expected`,
				impact: "workflow_blocked",
			}),
		);
		const incident = await getReliabilityIncident(
			db,
			first.incident.problemKey,
		);
		expect(incident?.status).toBe("DETECTED");
		expect(incident?.severity).toBe("P1");
		expect(incident?.occurrenceCount).toBe(2);
	});
	it("keeps chronological bounds for out-of-order events and does not downgrade severity", async () => {
		const first = event("newer", {
			groupId: `${service.id}-ordering`,
			impact: "data_corruption",
		});
		await ingestReliabilityOccurrence(db, first);
		await ingestReliabilityOccurrence(
			db,
			event("older", {
				groupId: `${service.id}-ordering`,
				occurredAt: "2026-09-08T00:00:00Z",
				impact: "isolated",
			}),
		);
		const incident = await getReliabilityIncident(
			db,
			first.incident.problemKey,
		);
		expect(incident?.severity).toBe("P0");
		expect(incident?.firstSeenAt.toISOString()).toBe(
			"2026-09-08T00:00:00.000Z",
		);
		expect(incident?.lastSeenAt.toISOString()).toBe("2026-09-09T12:00:00.000Z");
		expect(incident?.occurrenceCount).toBe(2);
	});
	it("rejects conflicting reuse of an occurrence identity instead of returning another problem", async () => {
		await ingestReliabilityOccurrence(
			db,
			event("conflict", { groupId: `${service.id}-original` }),
		);
		await expect(
			ingestReliabilityOccurrence(
				db,
				event("conflict", { groupId: `${service.id}-different` }),
			),
		).rejects.toThrow("Reliability occurrence identity conflict");
	});
});
