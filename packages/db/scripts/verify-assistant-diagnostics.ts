// Local-only integration verification. All synthetic rows and reviews roll back.
// Run with the repository with-env wrapper and --conversation-id <owned QA chat>.
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { db } from "../src/index";
import {
	listAssistantDiagnostics,
	getAssistantDiagnostic,
	reviewAssistantDiagnostic,
} from "../src/queries/assistant-diagnostics";
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "3307")
	throw new Error("Local QA database required");
const rollback = new Error("QA_ROLLBACK");
const checks: string[] = [];
const environment = `qa-${randomUUID().slice(0, 8)}`;
const conversationId =
	process.argv[process.argv.indexOf("--conversation-id") + 1];
if (
	!process.argv.includes("--conversation-id") ||
	!conversationId ||
	conversationId.startsWith("--")
)
	throw new Error(
		"Supply --conversation-id for an existing Super Admin QA conversation",
	);
try {
	const chat = await db.assistantConversation.findUniqueOrThrow({
		where: { id: conversationId },
		select: { ownerUserId: true },
	});
	await db.$transaction(
		async (tx) => {
			const fixtureDb = new Proxy(tx, {
				get(target, property) {
					return property === "$transaction"
						? async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
						: Reflect.get(target, property);
				},
			});
			const base = {
				fingerprint: "b".repeat(64),
				stage: "provider",
				operation: "qa.inbox.integration",
				code: "INTERNAL_ERROR",
				severity: "error",
				outcome: "temporary",
				publicMessage: "Test failure",
				environment,
				provider: "deepseek",
				model: "deepseek-flash",
				expiresAt: new Date(Date.now() + 3600000),
				createdAt: new Date("2026-09-15T00:00:00.000Z"),
			};
			const refs = Array.from(
				{ length: 4 },
				() =>
					`ERR-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
			)
				.sort()
				.reverse();
			for (const reference of refs)
				await tx.assistantDiagnostic.create({ data: { ...base, reference } });
			await tx.assistantDiagnostic.create({
				data: {
					...base,
					reference: `ERR-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
					expiresAt: new Date(0),
				},
			});
			const page1 = await listAssistantDiagnostics(
				fixtureDb as never,
				chat.ownerUserId,
				{ environment, take: 2 },
			);
			assert.deepEqual(
				page1.items.map((x) => x.reference),
				refs.slice(0, 2),
			);
			assert.ok(page1.nextCursor);
			assert.ok(page1.items.every((x) => !("details" in x)));
			checks.push(
				"stable tied-timestamp ordering, bounded summary-only first page, expired row excluded",
			);
			const page2 = await listAssistantDiagnostics(
				fixtureDb as never,
				chat.ownerUserId,
				{ environment, take: 2, cursor: page1.nextCursor! },
			);
			assert.deepEqual(
				page2.items.map((x) => x.reference),
				refs.slice(2),
			);
			assert.equal(page2.nextCursor, null);
			checks.push("second page has remaining rows without duplicates");
			await reviewAssistantDiagnostic(fixtureDb as never, chat.ownerUserId, {
				reference: refs[0],
				status: "resolved",
				note: "Synthetic transactional QA",
			});
			const detail = await getAssistantDiagnostic(
				fixtureDb as never,
				chat.ownerUserId,
				refs[0],
			);
			assert.equal(detail?.status, "resolved");
			assert.equal(detail?.reviews[0]?.fromStatus, "new");
			assert.equal(detail?.reviews[0]?.note, "Synthetic transactional QA");
			assert.equal(
				(
					await listAssistantDiagnostics(fixtureDb as never, chat.ownerUserId, {
						environment,
						status: "resolved",
						stage: "provider",
						outcome: "temporary",
						provider: "deepseek",
						model: "deepseek-flash",
						from: new Date("2026-09-14"),
						to: new Date("2026-09-16"),
					})
				).items.length,
				1,
			);
			assert.equal(
				(
					await listAssistantDiagnostics(fixtureDb as never, chat.ownerUserId, {
						environment,
						model: "no-match",
					})
				).items.length,
				0,
			);
			await assert.rejects(
				() => getAssistantDiagnostic(fixtureDb as never, -1, refs[0]),
				/access denied/,
			);
			checks.push(
				"combined filters, audited review and unauthorized guessed reference denied",
			);
			await tx.assistantDiagnostic.delete({ where: { reference: refs[1] } });
			const afterRemoval = await listAssistantDiagnostics(
				fixtureDb as never,
				chat.ownerUserId,
				{ environment, take: 2, cursor: page1.nextCursor! },
			);
			assert.deepEqual(
				afterRemoval.items.map((x) => x.reference),
				refs.slice(2),
				"pagination must survive retention removing its anchor",
			);
			checks.push("pagination survives removed anchor");
			throw rollback;
		},
		{ timeout: 20000, isolationLevel: "Serializable" },
	);
} catch (error) {
	if (error !== rollback) {
		console.log(JSON.stringify({ checks, transactionRolledBack: true }));
		throw error;
	}
} finally {
	try {
		assert.equal(
			await db.assistantDiagnostic.count({ where: { environment } }),
			0,
			"No synthetic diagnostic may survive rollback",
		);
	} finally {
		await db.$disconnect();
	}
}
console.log(JSON.stringify({ checks, transactionRolledBack: true }));
