import { createHash } from "node:crypto";
import { type Database, Prisma } from "..";

type RequestActor = {
	userId: number;
	scopeType: string;
	scopeId: string;
};

export function assistantSalesRequestFingerprint(
	type: "order" | "quote",
	text: string,
) {
	return createHash("sha256")
		.update(JSON.stringify([type, text]))
		.digest("hex");
}

export async function getAssistantSalesRequestSession(
	db: Database,
	actor: RequestActor,
	conversationId: string,
) {
	return db.assistantSalesRequestSession.findFirst({
		where: {
			conversationId,
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			conversation: {
				ownerUserId: actor.userId,
				scopeType: actor.scopeType,
				scopeId: actor.scopeId,
				deletedAt: null,
			},
		},
	});
}

export async function createAssistantSalesRequestSession(
	db: Database,
	actor: RequestActor,
	input: {
		conversationId: string;
		requestId: string;
		type: "order" | "quote";
		text: string;
		selection: { provider: string; model: string };
	},
) {
	const fingerprint = assistantSalesRequestFingerprint(input.type, input.text);
	const existing = await getAssistantSalesRequestSession(
		db,
		actor,
		input.conversationId,
	);
	if (existing) return { session: existing, created: false, fingerprint };
	try {
		const session = await db.assistantSalesRequestSession.create({
			data: {
				conversationId: input.conversationId,
				ownerUserId: actor.userId,
				scopeType: actor.scopeType,
				scopeId: actor.scopeId,
				saleType: input.type,
				sourceText: input.text,
				sourceFingerprint: fingerprint,
				requestId: input.requestId,
				provider: input.selection.provider,
				model: input.selection.model,
				status: "processing",
			},
		});
		return { session, created: true, fingerprint };
	} catch (error) {
		if (
			!(error instanceof Prisma.PrismaClientKnownRequestError) ||
			error.code !== "P2002"
		)
			throw error;
		const session = await getAssistantSalesRequestSession(
			db,
			actor,
			input.conversationId,
		);
		if (!session) throw error;
		return { session, created: false, fingerprint };
	}
}
