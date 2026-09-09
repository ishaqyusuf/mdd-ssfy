import { afterAll, describe, expect, it } from "bun:test";
import {
	createHash,
	createHmac,
	generateKeyPairSync,
	randomUUID,
} from "node:crypto";
import {
	createReliabilityGithubIssue,
	prepareIncidentIntake,
	prepareSentryAlert,
	prepareTriggerRun,
	prepareVercelQueryPage,
	publishGithubIncident,
} from "@gnd/observability/reliability";
import { handleVercelDrainRequest } from "../../../../apps/api/src/rest/reliability-vercel";
import { handleVercelDeploymentRequest } from "../../../../apps/api/src/rest/reliability-vercel-deployment";
import { reliabilityRouter } from "../../../../apps/api/src/trpc/routers/reliability.route";
import { publishConfiguredGithubIncident } from "../../../jobs/src/reliability/configured-github-publication";
import { recoverConfiguredGithubDelivery } from "../../../jobs/src/reliability/configured-github-recovery";
import { deliverReliabilityIncident } from "../../../jobs/src/reliability/deliver-incident";
import { previewReliabilityIncident } from "../../../jobs/src/reliability/preview-incident";
import { reconcileSentrySource } from "../../../jobs/src/reliability/reconcile-sentry";
import { reconcileTriggerSource } from "../../../jobs/src/reliability/reconcile-trigger";
import { reconcileVercelSource } from "../../../jobs/src/reliability/reconcile-vercel";
import { recoverGithubDelivery } from "../../../jobs/src/reliability/recover-github";
import { createDatabaseClient } from "../index";
import {
	getReliabilityIncident,
	ingestReliabilityOccurrence,
} from "./reliability";
import { applyReliabilityAction } from "./reliability-actions";
import { getReliabilityCursorHealth } from "./reliability-cursor";
import {
	claimReliabilityCursor,
	deferReliabilityCursor,
	recordReliabilityCursorPage,
} from "./reliability-cursor";
import {
	claimReliabilityDelivery,
	expireGithubSender,
	extendGithubRecoveryCooldown,
	getReliabilityDeliveryHealth,
	listDueGithubRecoveries,
	recordReliabilityDeliveryReceipt,
	reserveGithubRecoveryScan,
	settleReliabilityDelivery,
} from "./reliability-delivery";
import {
	getReliabilityEvidencePacket,
	initializeReliabilityEvidenceDraft,
} from "./reliability-evidence";
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
	it("paginates a full incident list without duplicates or omissions", async () => {
		const prefix = `${service.id}-pagination`;
		const ids = Array.from(
			{ length: 53 },
			(_, index) => `${prefix}-${String(index).padStart(3, "0")}`,
		);
		await db.reliabilityIncident.createMany({
			data: ids.map((id) => ({
				id,
				problemKey: createHash("sha256").update(id).digest("hex"),
				serviceId: service.id,
				owner: service.owner,
				severity: "P2",
				status: "NEEDS_INVESTIGATION",
				occurrenceCount: 0,
				firstSeenAt: now,
				lastSeenAt: now,
			})),
		});
		const { listReliabilityIncidents } = await import("./reliability-list");
		const principal = { actorId: "reviewer", serviceIds: [service.id] };
		const first = await listReliabilityIncidents(
			db,
			{ serviceId: service.id },
			principal,
		);
		if (first.status !== "ok") throw new Error("Expected list");
		expect(first.items).toHaveLength(50);
		expect(first.nextCursor).toBe(first.items.at(-1)?.id);
		const seen = first.items.map((item) => item.id);
		let cursor = first.nextCursor;
		let pages = 1;
		while (cursor && pages < 10) {
			const page = await listReliabilityIncidents(
				db,
				{ serviceId: service.id, cursor },
				principal,
			);
			if (page.status !== "ok") throw new Error("Expected page");
			seen.push(...page.items.map((item) => item.id));
			cursor = page.nextCursor;
			pages++;
		}
		expect(cursor).toBeNull();
		expect(new Set(seen).size).toBe(seen.length);
		expect(ids.every((id) => seen.includes(id))).toBe(true);
		await db.reliabilityIncident.deleteMany({ where: { id: { in: ids } } });
	});
	it("lists only the authorized service and supports a stable continuation cursor", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("list", { groupId: `${service.id}-list` }),
		);
		const previous = process.env.RELIABILITY_REVIEWER_MEMBERSHIPS;
		process.env.RELIABILITY_REVIEWER_MEMBERSHIPS = JSON.stringify([
			{ userId: 42, serviceIds: [service.id] },
		]);
		try {
			const caller = reliabilityRouter.createCaller({ db, userId: 42 });
			const result = await caller.list({ serviceId: service.id });
			expect(result.items.some((item) => item.id === incident.id)).toBe(true);
			expect(result.items.every((item) => item.serviceId === service.id)).toBe(
				true,
			);
			expect(result.items.length).toBeLessThanOrEqual(50);
			expect(result.items[0]).not.toHaveProperty("analysis");
			const next = await caller.list({
				serviceId: service.id,
				cursor: incident.id,
			});
			expect(next.items.every((item) => item.id < incident.id)).toBe(true);
			await expect(caller.list({ serviceId: "other" })).rejects.toMatchObject({
				code: "FORBIDDEN",
			});
		} finally {
			if (previous === undefined)
				Reflect.deleteProperty(process.env, "RELIABILITY_REVIEWER_MEMBERSHIPS");
			else process.env.RELIABILITY_REVIEWER_MEMBERSHIPS = previous;
		}
	});
	it("serves an authorized preview through tRPC and rejects an outdated revision", async () => {
		const groupId = `${service.id}-route-preview`;
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("route-preview", { groupId }),
		);
		const previous = process.env.RELIABILITY_REVIEWER_MEMBERSHIPS;
		process.env.RELIABILITY_REVIEWER_MEMBERSHIPS = JSON.stringify([
			{ userId: 42, serviceIds: [service.id] },
		]);
		try {
			const caller = reliabilityRouter.createCaller({ db, userId: 42 });
			const scope = {
				incidentId: incident.id,
				serviceId: service.id,
				revision: incident.revision,
			};
			const preview = await caller.preview(scope);
			expect(preview.status).toBe("preview");
			if (preview.status !== "preview") throw new Error("Expected preview");
			expect(preview.evidence).toContain("Recorded events: 1");
			const { incident: updated } = await ingestReliabilityOccurrence(
				db,
				event("route-preview-next", { groupId }),
			);
			expect(await caller.preview(scope)).toEqual({ status: "not_available" });
			const next = await caller.preview({
				...scope,
				revision: updated.revision,
			});
			expect(next.status).toBe("preview");
			if (next.status !== "preview") throw new Error("Expected new preview");
			expect(next.digest).not.toBe(preview.digest);
			expect(next.evidence).toContain("Recorded events: 2");
		} finally {
			if (previous === undefined)
				Reflect.deleteProperty(process.env, "RELIABILITY_REVIEWER_MEMBERSHIPS");
			else process.env.RELIABILITY_REVIEWER_MEMBERSHIPS = previous;
		}
	});
	it("previews a scoped incident draft without claiming delivery or approving it", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("preview", { groupId: `${service.id}-preview` }),
		);
		const scope = {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
		};
		const principal = { actorId: "reviewer", serviceIds: [service.id] };
		expect(
			await previewReliabilityIncident(db, scope, {
				...principal,
				serviceIds: [],
			}),
		).toEqual({ status: "forbidden" });
		const preview = await previewReliabilityIncident(db, scope, principal);
		expect(preview.status).toBe("preview");
		if (preview.status !== "preview") throw new Error("Expected preview");
		expect(preview.digest).toMatch(/^[a-f0-9]{64}$/);
		expect(preview.evidence).toContain("Recorded events: 1");
		expect(await previewReliabilityIncident(db, scope, principal)).toEqual(
			preview,
		);
		const stored = await db.reliabilityIncident.findUniqueOrThrow({
			where: { id: incident.id },
			include: { deliveries: true },
		});
		expect(stored.analysis).toBeNull();
		expect(
			stored.deliveries.every(
				(delivery) => delivery.status === "PENDING" && delivery.attempts === 0,
			),
		).toBe(true);
	});
	it("stores one unapproved evidence draft without overwriting existing analysis", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("draft", {
				groupId: `${service.id}-draft`,
			}),
		);
		const scope = {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
		};
		expect(
			await initializeReliabilityEvidenceDraft(db, {
				...scope,
				serviceId: "other",
			}),
		).toEqual({ status: "not_available" });
		expect(
			await initializeReliabilityEvidenceDraft(db, {
				...scope,
				revision: scope.revision + 1,
			}),
		).toEqual({ status: "not_available" });
		const results = await Promise.all([
			initializeReliabilityEvidenceDraft(db, scope),
			initializeReliabilityEvidenceDraft(db, scope),
		]);
		expect(results.filter((r) => r.status === "saved")).toHaveLength(1);
		const stored = await db.reliabilityIncident.findUniqueOrThrow({
			where: { id: incident.id },
		});
		expect(stored.analysis).toMatchObject({
			state: "DRAFT",
			packet: { revision: incident.revision, incidentId: incident.id },
		});
		expect(stored.revision).toBe(incident.revision);
		expect(await initializeReliabilityEvidenceDraft(db, scope)).toEqual({
			status: "not_saved",
		});
	});
	it("builds an evidence snapshot only for the requested service and revision", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("packet", {
				groupId: `${service.id}-packet`,
				impact: "workflow_blocked",
				evidence: { deploymentId: "deployment-1", rawLog: "private payload" },
			}),
		);
		const scope = {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
		};
		const packet = await getReliabilityEvidencePacket(db, scope);
		expect(packet?.routing).toBe("urgent_investigation");
		expect(packet?.counts.events.value).toBe(1);
		expect(packet?.evidenceReferences[0]?.correlation).toEqual({
			deploymentId: "deployment-1",
		});
		expect(packet?.evidenceReferences[0]?.impact).toBe("workflow_blocked");
		expect(JSON.stringify(packet)).not.toContain("private payload");
		expect(packet?.counts.operations).toEqual({
			value: null,
			precision: "unknown",
		});
		expect(
			await getReliabilityEvidencePacket(db, { ...scope, serviceId: "other" }),
		).toBeNull();
		expect(
			await getReliabilityEvidencePacket(db, {
				...scope,
				revision: scope.revision + 1,
			}),
		).toBeNull();
	});
	it("reserves one recovery scan and preserves uncertainty during cooldown", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("recovery-cooldown", {
				groupId: `${service.id}-recovery-cooldown`,
			}),
		);
		const clock = new Date(Date.now() + 1000);
		await deliverReliabilityIncident(db, {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
			destination: "GITHUB",
			now: () => clock,
			publish: async () => ({
				status: "UNCERTAIN",
				errorCode: "RESPONSE_LOST",
			}),
		});
		const row = await db.reliabilityDelivery.findFirstOrThrow({
			where: { incidentId: incident.id, destination: "GITHUB" },
		});
		const input = { deliveryId: row.id, serviceId: service.id, now: clock };
		expect(
			(
				await listDueGithubRecoveries(db, {
					serviceIds: [service.id],
					now: clock,
					limit: 1,
				})
			).map((value) => value.id),
		).toEqual([row.id]);
		expect(
			await listDueGithubRecoveries(db, {
				serviceIds: ["wrong-service"],
				now: clock,
				limit: 1,
			}),
		).toEqual([]);
		const claims = await Promise.all([
			reserveGithubRecoveryScan(db, input),
			reserveGithubRecoveryScan(db, input),
		]);
		expect(claims.filter(Boolean)).toHaveLength(1);
		expect(
			await listDueGithubRecoveries(db, {
				serviceIds: [service.id],
				now: clock,
				limit: 1,
			}),
		).toEqual([]);
		expect(
			await reserveGithubRecoveryScan(db, {
				...input,
				now: new Date(clock.getTime() + 299_000),
			}),
		).toBe(false);
		expect(
			(
				await db.reliabilityDelivery.findUniqueOrThrow({
					where: { id: row.id },
				})
			).status,
		).toBe("UNCERTAIN");
		expect(
			await reserveGithubRecoveryScan(db, {
				...input,
				now: new Date(clock.getTime() + 300_000),
			}),
		).toBe(true);
		const providerDeadline = new Date(clock.getTime() + 1_200_000);
		expect(
			await extendGithubRecoveryCooldown(db, {
				deliveryId: row.id,
				serviceId: service.id,
				retryAt: providerDeadline,
			}),
		).toBe(true);
		expect(
			await extendGithubRecoveryCooldown(db, {
				deliveryId: row.id,
				serviceId: service.id,
				retryAt: new Date(clock.getTime() + 900_000),
			}),
		).toBe(false);
		expect(
			await reserveGithubRecoveryScan(db, {
				...input,
				now: new Date(clock.getTime() + 1_199_000),
			}),
		).toBe(false);
		expect(
			(
				await db.reliabilityDelivery.findUniqueOrThrow({
					where: { id: row.id },
				})
			).nextAttemptAt.getTime(),
		).toBe(providerDeadline.getTime());
		expect(
			await reserveGithubRecoveryScan(db, { ...input, now: providerDeadline }),
		).toBe(true);
		await recordReliabilityDeliveryReceipt(db, {
			deliveryId: row.id,
			actionKey: row.actionKey,
			remoteId: "96",
			now: clock,
		});
	});
	it("recovers configured delivery with read-only credentials while publication is disabled", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("configured-recovery", {
				groupId: `${service.id}-configured-recovery`,
			}),
		);
		const clock = new Date(Date.now() + 1000);
		await deliverReliabilityIncident(db, {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
			destination: "GITHUB",
			now: () => clock,
			publish: async () => ({
				status: "UNCERTAIN",
				errorCode: "RESPONSE_LOST",
			}),
		});
		const delivery = await db.reliabilityDelivery.findFirstOrThrow({
			where: { incidentId: incident.id, destination: "GITHUB" },
		});
		const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
		const entry = {
			serviceId: service.id,
			repository: "gnd/fixture",
			repositoryId: 2,
			installationId: 3,
			actorId: 4,
			clientId: "Iv1.fixture",
			privateKeyEnv: "RELIABILITY_GITHUB_APP_KEY_FIXTURE",
		};
		const requests: string[] = [];
		const result = await recoverConfiguredGithubDelivery(
			db,
			{
				deliveryId: delivery.id,
				serviceId: service.id,
				environment: "PRODUCTION",
				now: () => clock,
				env: {
					RELIABILITY_GITHUB_RECOVERY_ENABLED: "true",
					RELIABILITY_GITHUB_REGISTRATIONS: JSON.stringify([entry]),
					RELIABILITY_GITHUB_APP_KEY_FIXTURE: privateKey
						.export({ type: "pkcs8", format: "pem" })
						.toString(),
				},
			},
			async (url, init) => {
				requests.push(`${init?.method} ${new URL(String(url)).pathname}`);
				if (requests.length === 1) {
					expect(JSON.parse(String(init?.body)).permissions).toEqual({
						issues: "read",
					});
					return Response.json(
						{
							token: "ghs_read_fixture",
							expires_at: new Date(clock.getTime() + 3_600_000).toISOString(),
							permissions: { issues: "read" },
							repositories: [{ id: 2, full_name: entry.repository }],
						},
						{ status: 201 },
					);
				}
				expect(new Headers(init?.headers).get("authorization")).toBe(
					"Bearer ghs_read_fixture",
				);
				return Response.json([
					{
						number: 95,
						html_url: "https://github.com/gnd/fixture/issues/95",
						user: { id: 4 },
						body: `<!-- reliability:${incident.id}:start -->\nEvidence\n<!-- reliability:${incident.id}:end -->\n<!-- reliability-action:${delivery.actionKey} -->`,
					},
				]);
			},
		);
		expect(result.status).toBe("recovered");
		expect(requests).toEqual([
			"POST /app/installations/3/access_tokens",
			"GET /repos/gnd/fixture/issues",
		]);
		const saved = await db.reliabilityDelivery.findUniqueOrThrow({
			where: { id: delivery.id },
		});
		expect(saved.status).toBe("SENT");
		expect(saved.remoteId).toBe("95");
	});
	it("keeps recovery independently disabled and skips credentials for ineligible deliveries", async () => {
		let requests = 0;
		const base = {
			deliveryId: "missing",
			serviceId: service.id,
			now: () => now,
		};
		const request = async () => {
			requests++;
			throw new Error("Must not request");
		};
		expect(
			(
				await recoverConfiguredGithubDelivery(
					db,
					{
						...base,
						environment: "PRODUCTION",
						env: { RELIABILITY_GITHUB_PUBLICATION_ENABLED: "true" },
					},
					request,
				)
			).status,
		).toBe("disabled");
		expect(
			(
				await recoverConfiguredGithubDelivery(
					db,
					{
						...base,
						environment: "DEVELOPMENT",
						env: { RELIABILITY_GITHUB_RECOVERY_ENABLED: "true" },
					},
					request,
				)
			).status,
		).toBe("disabled");
		expect(
			(
				await recoverConfiguredGithubDelivery(
					db,
					{
						...base,
						environment: "PRODUCTION",
						env: {
							RELIABILITY_GITHUB_RECOVERY_ENABLED: "true",
							RELIABILITY_GITHUB_REGISTRATIONS: "invalid",
						},
					},
					request,
				)
			).status,
		).toBe("not_eligible");
		expect(requests).toBe(0);
	});
	it("publishes a configured incident using a scoped app token and persists its receipt", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("configured-github", {
				groupId: `${service.id}-configured-github`,
			}),
		);
		const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
		const clock = new Date(Date.now() + 1000);
		const entry = {
			serviceId: service.id,
			repository: "gnd/fixture",
			repositoryId: 2,
			installationId: 3,
			actorId: 4,
			clientId: "Iv1.fixture",
			privateKeyEnv: "RELIABILITY_GITHUB_APP_KEY_FIXTURE",
		};
		const paths: string[] = [];
		const result = await publishConfiguredGithubIncident(
			db,
			{
				env: {
					RELIABILITY_GITHUB_PUBLICATION_ENABLED: "true",
					RELIABILITY_GITHUB_REGISTRATIONS: JSON.stringify([entry]),
					RELIABILITY_GITHUB_APP_KEY_FIXTURE: privateKey
						.export({ type: "pkcs8", format: "pem" })
						.toString(),
				},
				environment: "PRODUCTION",
				incidentId: incident.id,
				serviceId: service.id,
				revision: incident.revision,
				title: "Reviewed incident",
				evidence: "Reviewed evidence",
				now: () => clock,
			},
			async (url, init) => {
				paths.push(new URL(String(url)).pathname);
				if (paths.length === 1) {
					expect(JSON.parse(String(init?.body))).toEqual({
						repository_ids: [2],
						permissions: { issues: "write" },
					});
					return Response.json(
						{
							token: "ghs_fixture",
							expires_at: new Date(clock.getTime() + 3_600_000).toISOString(),
							permissions: { issues: "write" },
							repositories: [{ id: 2, full_name: "gnd/fixture" }],
						},
						{ status: 201 },
					);
				}
				expect(new Headers(init?.headers).get("authorization")).toBe(
					"Bearer ghs_fixture",
				);
				expect(JSON.parse(String(init?.body)).body).toContain(
					`reliability:${incident.id}:start`,
				);
				return Response.json(
					{ number: 94, html_url: "https://github.com/gnd/fixture/issues/94" },
					{ status: 201 },
				);
			},
		);
		expect(result.status).toBe("SENT");
		expect(paths).toEqual([
			"/app/installations/3/access_tokens",
			"/repos/gnd/fixture/issues",
		]);
		expect(JSON.stringify(result)).not.toContain("ghs_fixture");
		const delivery = await db.reliabilityDelivery.findFirstOrThrow({
			where: { incidentId: incident.id, destination: "GITHUB" },
		});
		expect(delivery.remoteId).toBe("94");
		expect(delivery.status).toBe("SENT");
	});
	it("keeps configured GitHub publication inert outside its production opt-in", async () => {
		let requests = 0;
		for (const settings of [
			{ environment: "PRODUCTION", env: {} },
			{
				environment: "DEVELOPMENT",
				env: { RELIABILITY_GITHUB_PUBLICATION_ENABLED: "true" },
			},
		]) {
			const result = await publishConfiguredGithubIncident(
				db,
				{
					...settings,
					incidentId: "unused",
					serviceId: service.id,
					revision: 1,
					title: "Draft",
					evidence: "Evidence",
					now: () => now,
				},
				async () => {
					requests++;
					throw new Error("Must not request");
				},
			);
			expect(result.status).toBe("disabled");
		}
		expect(requests).toBe(0);
	});
	it("recovers a lost evidence comment without recreating the issue or comment", async () => {
		const groupId = `${service.id}-comment-recovery`;
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("comment-initial", { groupId }),
		);
		const clock = new Date(Date.now() + 1000);
		const base = {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
			destination: "GITHUB" as const,
			now: () => clock,
		};
		await deliverReliabilityIncident(db, {
			...base,
			publish: async () => ({ status: "SENT", remoteId: "93" }),
		});
		const latest = await ingestReliabilityOccurrence(
			db,
			event("comment-next", { groupId }),
		);
		let writes = 0;
		let commentBody = "";
		const update = {
			...base,
			revision: latest.incident.revision,
			publish: async (delivery: {
				actionKey: string;
				attempt: number;
				remoteId: string | null;
			}) =>
				publishGithubIncident(
					{
						repository: "gnd/fixture",
						token: "fixture",
						incidentId: incident.id,
						title: "Incident",
						evidence: "Updated evidence",
						...delivery,
					},
					async (url, init) => {
						writes++;
						expect(String(url)).toBe(
							"https://api.github.com/repos/gnd/fixture/issues/93/comments",
						);
						commentBody = JSON.parse(String(init?.body)).body;
						throw new Error("Response lost after comment creation");
					},
					() => clock,
				),
		};
		expect((await deliverReliabilityIncident(db, update)).status).toBe(
			"UNCERTAIN",
		);
		expect((await deliverReliabilityIncident(db, update)).status).toBe(
			"not_claimed",
		);
		const uncertain = await db.reliabilityDelivery.findFirstOrThrow({
			where: {
				incidentId: incident.id,
				destination: "GITHUB",
				status: "UNCERTAIN",
			},
		});
		expect(uncertain.remoteId).toBe("93");
		const recovered = await recoverGithubDelivery(
			db,
			{
				deliveryId: uncertain.id,
				serviceId: service.id,
				repository: "gnd/fixture",
				token: "fixture",
				actorId: 123,
				now: () => clock,
			},
			async (url) => {
				expect(new URL(String(url)).pathname).toBe(
					"/repos/gnd/fixture/issues/93/comments",
				);
				return Response.json([
					{
						id: 991,
						html_url:
							"https://github.com/gnd/fixture/issues/93#issuecomment-991",
						user: { id: 123 },
						body: commentBody,
					},
				]);
			},
		);
		expect(recovered.status).toBe("recovered");
		expect(
			(
				await db.reliabilityDelivery.findUniqueOrThrow({
					where: { id: uncertain.id },
				})
			).remoteId,
		).toBe("93");
		expect((await deliverReliabilityIncident(db, update)).status).toBe(
			"not_claimed",
		);
		expect(writes).toBe(1);
	});
	it("holds a worker's unknown publication result until a matching receipt is recovered", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("worker-unknown", { groupId: `${service.id}-worker-unknown` }),
		);
		const clock = new Date(Date.now() + 1000);
		let calls = 0;
		const input = {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
			destination: "GITHUB" as const,
			now: () => clock,
			publish: async () => {
				calls++;
				throw new Error(
					"Remote write may have succeeded; private provider details",
				);
			},
		};
		expect((await deliverReliabilityIncident(db, input)).status).toBe(
			"UNCERTAIN",
		);
		expect((await deliverReliabilityIncident(db, input)).status).toBe(
			"not_claimed",
		);
		expect(calls).toBe(1);
		const row = await db.reliabilityDelivery.findFirstOrThrow({
			where: { incidentId: incident.id, destination: "GITHUB" },
		});
		expect(row.lastErrorCode).toBe("PUBLICATION_RESULT_UNKNOWN");
		expect(
			await recordReliabilityDeliveryReceipt(db, {
				deliveryId: row.id,
				actionKey: "wrong",
				remoteId: "92",
				now: clock,
			}),
		).toBe(false);
		const recovery = {
			deliveryId: row.id,
			serviceId: service.id,
			repository: "gnd/fixture",
			token: "fixture",
			actorId: 123,
			now: () => clock,
		};
		let reads = 0;
		const request = async () => {
			reads++;
			return Response.json([
				{
					number: 92,
					html_url: "https://github.com/gnd/fixture/issues/92",
					user: { id: 123 },
					body: `<!-- reliability:${incident.id}:start -->\nEvidence\n<!-- reliability:${incident.id}:end -->\n<!-- reliability-action:${row.actionKey} -->`,
				},
			]);
		};
		expect(
			(
				await recoverGithubDelivery(
					db,
					{ ...recovery, serviceId: "wrong" },
					request,
				)
			).status,
		).toBe("not_eligible");
		expect(reads).toBe(0);
		expect((await recoverGithubDelivery(db, recovery, request)).status).toBe(
			"recovered",
		);
		expect((await recoverGithubDelivery(db, recovery, request)).status).toBe(
			"not_eligible",
		);
		expect(reads).toBe(1);
		expect((await deliverReliabilityIncident(db, input)).status).toBe(
			"not_claimed",
		);
		expect(calls).toBe(1);
	});
	it("orchestrates one scoped publication and carries the receipt to later revisions", async () => {
		const groupId = `${service.id}-worker`;
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("worker-first", { groupId }),
		);
		const clock = new Date(Date.now() + 1000);
		const base = {
			incidentId: incident.id,
			serviceId: service.id,
			revision: incident.revision,
			destination: "GITHUB" as const,
			now: () => clock,
		};
		let creates = 0;
		const publish = async (delivery: {
			actionKey: string;
			attempt: number;
			remoteId: string | null;
		}) => {
			expect(delivery.remoteId).toBeNull();
			creates++;
			return createReliabilityGithubIssue(
				{
					repository: "gnd/fixture",
					token: "fixture",
					incidentId: incident.id,
					title: "Incident",
					evidence: "Safe evidence",
					...delivery,
				},
				async () =>
					Response.json(
						{
							number: 91,
							html_url: "https://github.com/gnd/fixture/issues/91",
						},
						{ status: 201 },
					),
				() => clock,
			);
		};
		expect(
			(
				await deliverReliabilityIncident(db, {
					...base,
					serviceId: "wrong",
					publish,
				})
			).status,
		).toBe("not_claimed");
		expect(
			(await deliverReliabilityIncident(db, { ...base, publish })).status,
		).toBe("SENT");
		expect(
			(await deliverReliabilityIncident(db, { ...base, publish })).status,
		).toBe("not_claimed");
		const latest = await ingestReliabilityOccurrence(
			db,
			event("worker-next", { groupId }),
		);
		const updated = await deliverReliabilityIncident(db, {
			...base,
			revision: latest.incident.revision,
			publish: async (delivery) => {
				expect(delivery.remoteId).toBe("91");
				return { status: "SENT", remoteId: "91" };
			},
		});
		expect(updated.status).toBe("SENT");
		expect(creates).toBe(1);
	});
	it("claims publication only for the current service-owned incident revision", async () => {
		const groupId = `${service.id}-publication-scope`;
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("scope-first", { groupId }),
		);
		const base = {
			incidentId: incident.id,
			destination: "GITHUB" as const,
			now: new Date(Date.now() + 1000),
			leaseMs: 30_000,
		};
		expect(
			await claimReliabilityDelivery(db, {
				...base,
				publication: {
					serviceId: "wrong-service",
					revision: incident.revision,
				},
			}),
		).toBeNull();
		const latest = await ingestReliabilityOccurrence(
			db,
			event("scope-next", { groupId }),
		);
		expect(
			await claimReliabilityDelivery(db, {
				...base,
				publication: { serviceId: service.id, revision: incident.revision },
			}),
		).toBeNull();
		const claim = await claimReliabilityDelivery(db, {
			...base,
			publication: {
				serviceId: service.id,
				revision: latest.incident.revision,
			},
		});
		expect(claim?.revision).toBe(latest.incident.revision);
		expect(claim?.attempts).toBe(1);
		if (!claim?.leaseId) throw new Error("Expected current claim");
		await settleReliabilityDelivery(db, {
			deliveryId: claim.id,
			leaseId: claim.leaseId,
			now: base.now,
			outcome: { status: "SUPPRESSED", errorCode: "TEST_COMPLETE" },
		});
	});
	it("persists GitHub throttling and the eventual repository receipt through the outbox", async () => {
		const { incident } = await ingestReliabilityOccurrence(
			db,
			event("github-create", { groupId: `${service.id}-github-create` }),
		);
		let clock = new Date(Date.now() + 1000);
		const claimInput = {
			incidentId: incident.id,
			destination: "GITHUB" as const,
			now: clock,
			leaseMs: 30_000,
		};
		const first = await claimReliabilityDelivery(db, claimInput);
		if (!first?.leaseId) throw new Error("Expected claim");
		const draft = {
			repository: "gnd/fixture",
			token: "fixture",
			incidentId: incident.id,
			actionKey: first.actionKey,
			attempt: first.attempts,
			title: "Incident",
			evidence: "Safe evidence",
		};
		const throttled = await createReliabilityGithubIssue(
			draft,
			async () =>
				new Response(null, { status: 429, headers: { "retry-after": "120" } }),
			() => clock,
		);
		expect(
			await settleReliabilityDelivery(db, {
				deliveryId: first.id,
				leaseId: first.leaseId,
				now: clock,
				outcome: throttled,
			}),
		).toBe(true);
		expect(
			await claimReliabilityDelivery(db, {
				...claimInput,
				now: new Date(clock.getTime() + 60_000),
			}),
		).toBeNull();
		clock = new Date(clock.getTime() + 121_000);
		const retry = await claimReliabilityDelivery(db, {
			...claimInput,
			now: clock,
		});
		if (!retry?.leaseId) throw new Error("Expected retry");
		expect(retry.attempts).toBe(2);
		const sent = await createReliabilityGithubIssue(
			{ ...draft, actionKey: retry.actionKey, attempt: retry.attempts },
			async () =>
				Response.json(
					{ number: 42, html_url: "https://github.com/gnd/fixture/issues/42" },
					{ status: 201 },
				),
			() => clock,
		);
		expect(
			await settleReliabilityDelivery(db, {
				deliveryId: retry.id,
				leaseId: retry.leaseId,
				now: clock,
				outcome: sent,
			}),
		).toBe(true);
		const saved = await db.reliabilityDelivery.findUniqueOrThrow({
			where: { id: retry.id },
		});
		expect(saved.status).toBe("SENT");
		expect(saved.remoteId).toBe("42");
		expect(
			await claimReliabilityDelivery(db, { ...claimInput, now: clock }),
		).toBeNull();
	});
	it("retains Vercel query evidence and resumes after a later window fails", async () => {
		const source = {
			account: "vercel-query-retry",
			project: "web",
			operation: "sales.save",
			service: {
				...service,
				sources: [
					{
						provider: "vercel" as const,
						account: "vercel-query-retry",
						project: "web",
					},
				],
			},
		};
		let clock = new Date("2026-09-09T12:00:00Z");
		const options = {
			now: () => clock,
			maxQueries: 5,
			maxDurationMs: 20_000,
			lookbackMs: 3_600_000,
			limit: 1,
		};
		let calls = 0;
		const first = await reconcileVercelSource(
			db,
			source,
			options,
			async (window) => {
				calls++;
				if (calls === 2) throw new Error("Provider unavailable");
				return prepareVercelQueryPage(
					Buffer.from(
						JSON.stringify({
							id: "req_recovery",
							deploymentId: "dpl_recovery",
							projectId: "web",
							environment: "production",
							source: "serverless",
							timestamp: Date.parse("2026-09-09T11:15:00Z"),
							level: "error",
							logs: [],
						}),
					),
					source,
					window,
					clock,
				);
			},
		);
		cursorIds.push(first.id);
		expect(first.status).toBe("deferred");
		expect(first.occurrences).toBe(1);
		expect(
			(
				await getReliabilityCursorHealth(db, {
					cursorId: first.id,
					now: clock,
					maxAgeMs: 900_000,
				})
			).reasons,
		).toEqual(["DISCOVERY_NEVER_COMPLETED"]);
		expect(
			(
				await db.reliabilityCursor.findUniqueOrThrow({
					where: { id: first.id },
				})
			).watermark,
		).toBeNull();
		clock = new Date("2026-09-09T12:01:01Z");
		const resumed = await reconcileVercelSource(
			db,
			source,
			{ ...options, limit: 100 },
			async (window) =>
				prepareVercelQueryPage(
					Buffer.from(
						window.since.getTime() < Date.parse("2026-09-09T11:30:00Z")
							? JSON.stringify({
									id: "req_recovery",
									deploymentId: "dpl_recovery",
									projectId: "web",
									environment: "production",
									source: "serverless",
									timestamp: Date.parse("2026-09-09T11:15:00Z"),
									level: "error",
									logs: [],
								})
							: "",
					),
					source,
					window,
					clock,
				),
		);
		expect(resumed.status).toBe("complete");
		expect(
			(
				await getReliabilityCursorHealth(db, {
					cursorId: first.id,
					now: clock,
					maxAgeMs: 900_000,
				})
			).status,
		).toBe("healthy");
		expect(
			(
				await getReliabilityCursorHealth(db, {
					cursorId: first.id,
					now: new Date("2026-09-09T12:20:00Z"),
					maxAgeMs: 900_000,
				})
			).reasons,
		).toEqual(["DISCOVERY_BEHIND", "POLL_STALE"]);
		const rows = await db.reliabilityOccurrence.findMany({
			where: { account: source.account, incident: { serviceId: service.id } },
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]?.evidence).toEqual({
			deploymentId: "dpl_recovery",
			requestId: "req_recovery",
		});
	});
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
		const sending = await claimReliabilityDelivery(db, {
			incidentId: incident.id,
			destination: "GITHUB",
			now: clock,
			leaseMs: 1000,
		});
		const afterExpiry = new Date(clock.getTime() + 1001);
		if (!sending) throw new Error("Expected sender");
		expect(
			await expireGithubSender(db, {
				deliveryId: sending.id,
				serviceId: service.id,
				now: clock,
			}),
		).toBe(false);
		expect(
			await expireGithubSender(db, {
				deliveryId: sending.id,
				serviceId: "wrong",
				now: afterExpiry,
			}),
		).toBe(false);
		expect(
			(
				await listDueGithubRecoveries(db, {
					serviceIds: [service.id],
					now: afterExpiry,
					limit: 10,
				})
			).some((row) => row.id === sending.id),
		).toBe(true);
		expect(
			await expireGithubSender(db, {
				deliveryId: sending.id,
				serviceId: service.id,
				now: afterExpiry,
			}),
		).toBe(true);
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
