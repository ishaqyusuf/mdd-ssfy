import { type Database, Prisma } from "../index";
import {
	decodeAssistantDiagnosticCursor,
	encodeAssistantDiagnosticCursor,
} from "./assistant-diagnostic-cursor";

export async function assertAssistantDiagnosticAdmin(
	db: Database,
	userId: number,
) {
	const user = await db.users.findFirst({
		where: {
			id: userId,
			deletedAt: null,
			accessRevokedAt: null,
			roles: {
				some: {
					deletedAt: null,
					organization: { deletedAt: null },
					role: { deletedAt: null, name: "Super Admin" },
				},
			},
		},
		select: { id: true },
	});
	if (!user) throw new Error("Assistant diagnostics access denied");
}

export async function recordAssistantDiagnostic(
	db: Database,
	data: Prisma.AssistantDiagnosticUncheckedCreateInput,
) {
	return db.assistantDiagnostic.upsert({
		where: { reference: data.reference },
		create: data,
		update: {},
		select: { reference: true },
	});
}

export type AssistantDiagnosticFilter = {
	status?: "new" | "investigating" | "resolved";
	stage?: string;
	outcome?: string;
	provider?: string;
	model?: string;
	environment?: string;
	reference?: string;
	from?: Date;
	to?: Date;
	cursor?: string;
	take?: number;
};

export async function listAssistantDiagnostics(
	db: Database,
	userId: number,
	input: AssistantDiagnosticFilter,
) {
	await assertAssistantDiagnosticAdmin(db, userId);
	const take = Math.min(50, Math.max(1, input.take ?? 20));
	const cursor = input.cursor
		? decodeAssistantDiagnosticCursor(input.cursor)
		: null;
	if (input.cursor && !cursor)
		throw new Error("Invalid Assistant diagnostic cursor");
	const where: Prisma.AssistantDiagnosticWhereInput = {
		expiresAt: { gt: new Date() },
		...(input.status ? { status: input.status } : {}),
		...(input.stage ? { stage: input.stage } : {}),
		...(input.outcome ? { outcome: input.outcome } : {}),
		...(input.provider ? { provider: input.provider } : {}),
		...(input.model ? { model: input.model } : {}),
		...(input.environment ? { environment: input.environment } : {}),
		...(input.reference ? { reference: input.reference } : {}),
		...(input.from || input.to
			? { createdAt: { gte: input.from, lte: input.to } }
			: {}),
		...(cursor
			? {
					AND: [
						{
							OR: [
								{ createdAt: { lt: cursor.createdAt } },
								{
									createdAt: cursor.createdAt,
									reference: { lt: cursor.reference },
								},
							],
						},
					],
				}
			: {}),
	};
	const items = await db.assistantDiagnostic.findMany({
		where,
		take: take + 1,
		orderBy: [{ createdAt: "desc" }, { reference: "desc" }],
		select: {
			reference: true,
			fingerprint: true,
			createdAt: true,
			stage: true,
			code: true,
			publicMessage: true,
			status: true,
			environment: true,
			provider: true,
			model: true,
			severity: true,
		},
	});
	const page = items.slice(0, take);
	const counts = page.length
		? await db.assistantDiagnostic.groupBy({
				by: ["fingerprint"],
				where: {
					expiresAt: { gt: new Date() },
					fingerprint: { in: page.map((item) => item.fingerprint) },
				},
				_count: { reference: true },
			})
		: [];
	return {
		items: page.map((item) => ({
			...item,
			occurrences:
				counts.find((count) => count.fingerprint === item.fingerprint)?._count
					.reference ?? 1,
		})),
		nextCursor:
			items.length > take && page.length
				? encodeAssistantDiagnosticCursor(page[page.length - 1]!)
				: null,
	};
}

export async function getAssistantDiagnostic(
	db: Database,
	userId: number,
	reference: string,
) {
	await assertAssistantDiagnosticAdmin(db, userId);
	const row = await db.assistantDiagnostic.findFirst({
		where: { reference, expiresAt: { gt: new Date() } },
		include: { reviews: { orderBy: { createdAt: "desc" }, take: 20 } },
	});
	if (!row) return null;
	// Admin metadata does not grant access to another employee's transcript.
	const conversation = row.conversationId
		? await db.assistantConversation.findFirst({
				where: {
					id: row.conversationId,
					ownerUserId: userId,
					scopeType: row.scopeType ?? undefined,
					scopeId: row.scopeId ?? undefined,
					deletedAt: null,
				},
				select: { id: true, title: true },
			})
		: null;
	const timeline = row.runId
		? await db.assistantToolExecution.findMany({
				where: { runId: row.runId },
				orderBy: { eventSequence: "asc" },
				take: 50,
				select: {
					toolId: true,
					status: true,
					startedAt: true,
					completedAt: true,
					durationMs: true,
					errorCode: true,
				},
			})
		: [];
	return { ...row, conversation, timeline };
}

export async function reviewAssistantDiagnostic(
	db: Database,
	userId: number,
	input: {
		reference: string;
		status: "new" | "investigating" | "resolved";
		note: string;
	},
) {
	await assertAssistantDiagnosticAdmin(db, userId);
	return db.$transaction(
		async (tx) => {
			const current = await tx.assistantDiagnostic.findFirst({
				where: { reference: input.reference, expiresAt: { gt: new Date() } },
			});
			if (!current) throw new Error("Assistant diagnostic not found");
			await tx.assistantDiagnostic.update({
				where: { reference: input.reference },
				data: { status: input.status },
			});
			await tx.assistantDiagnosticReview.create({
				data: {
					reference: input.reference,
					reviewerId: userId,
					fromStatus: current.status,
					status: input.status,
					note: input.note,
				},
			});
			return { reference: input.reference, status: input.status };
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}

export async function purgeExpiredAssistantDiagnostics(
	db: Database,
	now = new Date(),
) {
	const expired = await db.assistantDiagnostic.findMany({
		where: { expiresAt: { lte: now } },
		select: { reference: true },
		take: 200,
	});
	const references = expired.map((row) => row.reference);
	if (!references.length) return 0;
	return db.$transaction(async (tx) => {
		await tx.assistantDiagnosticReview.deleteMany({
			where: { reference: { in: references } },
		});
		return (
			await tx.assistantDiagnostic.deleteMany({
				where: { reference: { in: references }, expiresAt: { lte: now } },
			})
		).count;
	});
}
