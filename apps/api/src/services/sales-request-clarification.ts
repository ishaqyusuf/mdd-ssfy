import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { createSalesRequestPreview } from "./sales-request-preview";

type Preview = Awaited<ReturnType<typeof createSalesRequestPreview>>;
type Dependencies = Parameters<typeof createSalesRequestPreview>[1];
export type ClarificationQuestion = {
	id: string;
	lineUid: string | null;
	field: string;
	question: string;
	sourceText: string | null;
	reason: string;
};
type Answer = {
	questionId: string;
	answer: string;
	reuse: boolean;
	active: boolean;
	question: ClarificationQuestion;
};
type Session = {
	id: string;
	actorUserId: number;
	saleType: string;
	scope: string;
	configurationRevision: string;
	sourceText: string;
	revision: number;
	status: string;
	questions: unknown;
	answers: unknown;
};
export type ClarificationDatabase = {
	salesRequestClarificationSession: {
		create(args: { data: Record<string, unknown> }): Promise<Session>;
		findUnique(args: { where: { id: string } }): Promise<Session | null>;
		findMany(args: {
			where: Record<string, unknown>;
			orderBy?: Record<string, string>;
			take: number;
		}): Promise<Session[]>;
		updateMany(args: {
			where: Record<string, unknown>;
			data: Record<string, unknown>;
		}): Promise<{ count: number }>;
	};
};
function conflict(message: string): never {
	throw new TRPCError({ code: "CONFLICT", message });
}
export function clarificationSourceReference(
	reason: string,
	sourceText: string,
	productTitles: readonly string[] = [],
) {
	const quoted = [...reason.matchAll(/["“]([^"”]{4,160})["”]/g)]
		.map((match) => match[1]!)
		.find((phrase) => sourceText.toLowerCase().includes(phrase.toLowerCase()));
	const title =
		quoted ??
		productTitles
			.map((title) => title.trim())
			.filter(Boolean)
			.sort((left, right) => right.length - left.length)
			.find(
				(title) =>
					title.length >= 4 &&
					sourceText.toLowerCase().includes(title.toLowerCase()) &&
					reason.toLowerCase().includes(title.toLowerCase()),
			);
	if (!title) return null;
	const index = sourceText.toLowerCase().indexOf(title.toLowerCase());
	return sourceText.slice(index, index + title.length);
}
function questionsFor(
	preview: Preview,
	sourceText: string,
	productTitles: readonly string[] = [],
): ClarificationQuestion[] {
	return preview.seed.unresolved.map((item) => ({
		id: randomUUID(),
		lineUid: item.lineUid,
		field: item.field,
		question: `Please clarify ${item.field}.`,
		sourceText: clarificationSourceReference(
			item.reason,
			sourceText,
			productTitles,
		),
		reason: item.reason,
	}));
}
function surface(session: Session, questions: ClarificationQuestion[]) {
	return questions.length
		? {
				sessionId: session.id,
				revision: session.revision,
				round: session.revision,
				questions,
			}
		: null;
}
export async function ownedClarification(
	db: ClarificationDatabase,
	id: string,
	actorUserId: number,
) {
	const session = await db.salesRequestClarificationSession.findUnique({
		where: { id },
	});
	if (!session || session.actorUserId !== actorUserId)
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Request clarification not found.",
		});
	return session;
}
export function reusableClarification(
	answer: Answer,
	sourceText: string,
	productTitles: readonly string[] = [],
) {
	// Reuse narrow terminology only. Quantity, dimensions and order facts never become defaults.
	const field = answer.question.field.toLowerCase();
	const phrase = answer.question.sourceText?.trim().toLowerCase();
	return (
		answer.reuse &&
		answer.active &&
		/product|profile|material|finish|model|species|door/.test(field) &&
		!/quantity|qty|dimension|height|width|length|count|room|handing/.test(
			field,
		) &&
		(!/\d/.test(answer.answer) ||
			productTitles.some(
				(title) =>
					title.trim().toLowerCase() === answer.answer.trim().toLowerCase(),
			)) &&
		!!phrase &&
		phrase.length >= 4 &&
		sourceText.toLowerCase().includes(phrase)
	);
}
export async function readClarificationGuidance(
	db: ClarificationDatabase,
	input: {
		actorUserId: number;
		scope: string;
		configurationRevision: string;
		text: string;
		productTitles?: readonly string[];
	},
) {
	const sessions = await db.salesRequestClarificationSession.findMany({
		where: {
			actorUserId: input.actorUserId,
			scope: input.scope,
			configurationRevision: input.configurationRevision,
			status: "complete",
		},
		orderBy: { updatedAt: "desc" },
		take: 50,
	});
	const candidates = sessions
		.flatMap((session) =>
			(session.answers as Answer[])
				.filter((answer) =>
					reusableClarification(answer, input.text, input.productTitles),
				)
				.map((answer) => ({
					question: `For phrase "${answer.question.sourceText}": ${answer.question.question}`,
					answer: answer.answer,
					field: answer.question.field,
					sourceText: answer.question.sourceText,
				})),
		)
		.slice(0, 50);
	const byQuestion = new Map<string, Set<string>>();
	for (const candidate of candidates) {
		const key = candidate.question.toLowerCase();
		const values = byQuestion.get(key) ?? new Set<string>();
		values.add(candidate.answer.toLowerCase());
		byQuestion.set(key, values);
	}
	return candidates
		.filter(
			(candidate, index) =>
				byQuestion.get(candidate.question.toLowerCase())?.size === 1 &&
				candidates.findIndex(
					(other) =>
						other.question === candidate.question &&
						other.answer === candidate.answer,
				) === index,
		)
		.slice(0, 12);
}
export async function beginSalesRequestClarification(input: {
	db: ClarificationDatabase;
	actorUserId: number;
	type: "order" | "quote";
	text: string;
	signal: AbortSignal;
	dependencies: Dependencies;
}) {
	await input.dependencies.authorize();
	const snapshot = await input.dependencies.readSnapshot();
	const guidance = await readClarificationGuidance(input.db, {
		actorUserId: input.actorUserId,
		scope: snapshot.scope,
		configurationRevision: snapshot.revision,
		text: input.text,
		productTitles: snapshot.configuration.steps.flatMap((step) =>
			step.components.map((component) => component.title),
		),
	});
	const preview = await createSalesRequestPreview(
		{ text: input.text, images: [], signal: input.signal, guidance },
		input.dependencies,
	);
	input.signal.throwIfAborted();
	const questions = questionsFor(
		preview,
		input.text,
		snapshot.configuration.steps.flatMap((step) =>
			step.components.map((component) => component.title),
		),
	);
	if (!questions.length) return { ...preview, clarification: null };
	const session = await input.db.salesRequestClarificationSession.create({
		data: {
			id: randomUUID(),
			actorUserId: input.actorUserId,
			saleType: input.type,
			scope: preview.configurationScope,
			configurationRevision: preview.configurationRevision,
			sourceText: input.text,
			revision: 1,
			status: "awaiting",
			questions,
			answers: [],
		},
	});
	return { ...preview, clarification: surface(session, questions) };
}
export async function answerSalesRequestClarification(input: {
	db: ClarificationDatabase;
	actorUserId: number;
	sessionId: string;
	revision: number;
	answers: { questionId: string; answer: string; reuse: boolean }[];
	signal: AbortSignal;
	dependencies: Dependencies;
}) {
	const session = await ownedClarification(
		input.db,
		input.sessionId,
		input.actorUserId,
	);
	await input.dependencies.authorize();
	if (session.status !== "awaiting" || session.revision !== input.revision)
		conflict(
			"This questionnaire changed or is already being processed. Reload it before submitting.",
		);
	if (session.revision >= 10)
		conflict(
			"This request needs manual review after multiple clarification rounds. Start a simpler request or complete the sales form manually.",
		);
	const questions = session.questions as ClarificationQuestion[];
	if (
		input.answers.length !== questions.length ||
		new Set(input.answers.map((a) => a.questionId)).size !== questions.length ||
		input.answers.some(
			(a) => !questions.some((q) => q.id === a.questionId) || !a.answer.trim(),
		)
	)
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Answer every current question once.",
		});
	const snapshot = await input.dependencies.readSnapshot();
	if (
		snapshot.scope !== session.scope ||
		snapshot.revision !== session.configurationRevision
	)
		conflict("Sales configuration changed. Start a new request.");
	const guidance = await readClarificationGuidance(input.db, {
		actorUserId: input.actorUserId,
		scope: session.scope,
		configurationRevision: session.configurationRevision,
		text: session.sourceText,
		productTitles: snapshot.configuration.steps.flatMap((step) =>
			step.components.map((component) => component.title),
		),
	});
	const acquired = await input.db.salesRequestClarificationSession.updateMany({
		where: {
			id: session.id,
			actorUserId: input.actorUserId,
			revision: input.revision,
			status: "awaiting",
		},
		data: { status: "processing" },
	});
	if (acquired.count !== 1)
		conflict("This questionnaire is already being processed.");
	try {
		const answers: Answer[] = [
			...(session.answers as Answer[]),
			...input.answers.map((answer) => ({
				...answer,
				answer: answer.answer.trim(),
				active: answer.reuse,
				question: (() => {
					const question = questions.find((q) => q.id === answer.questionId)!;
					return {
						...question,
						sourceText:
							question.sourceText ??
							clarificationSourceReference(
								question.reason,
								session.sourceText,
								snapshot.configuration.steps.flatMap((step) =>
									step.components.map((component) => component.title),
								),
							),
					};
				})(),
			})),
		];
		if (
			answers.reduce(
				(total, answer) =>
					total + answer.answer.length + answer.question.reason.length,
				0,
			) > 24_000
		) {
			await input.db.salesRequestClarificationSession.updateMany({
				where: {
					id: session.id,
					revision: input.revision,
					status: "processing",
				},
				data: { status: "awaiting" },
			});
			conflict(
				"The clarification history is too long. Start a smaller request or complete the sales form manually.",
			);
		}
		const preview = await createSalesRequestPreview(
			{
				text: session.sourceText,
				images: [],
				signal: input.signal,
				guidance,
				clarifications: answers.map((a) => ({
					question: `${a.question.question} ${a.question.reason}`,
					answer: a.answer,
					field: a.question.field,
					sourceText:
						a.question.sourceText ??
						clarificationSourceReference(
							a.question.reason,
							session.sourceText,
							snapshot.configuration.steps.flatMap((step) =>
								step.components.map((component) => component.title),
							),
						),
				})),
			},
			input.dependencies,
		);
		input.signal.throwIfAborted();
		const nextQuestions = questionsFor(
			preview,
			session.sourceText,
			snapshot.configuration.steps.flatMap((step) =>
				step.components.map((component) => component.title),
			),
		);
		const updated = await input.db.salesRequestClarificationSession.updateMany({
			where: { id: session.id, revision: input.revision, status: "processing" },
			data: {
				revision: input.revision + 1,
				status: nextQuestions.length ? "awaiting" : "complete",
				questions: nextQuestions,
				answers,
			},
		});
		if (updated.count !== 1)
			conflict("This request was cancelled before the answers were applied.");
		return {
			...preview,
			clarification: surface(
				{ ...session, revision: input.revision + 1 },
				nextQuestions,
			),
		};
	} catch (error) {
		await input.db.salesRequestClarificationSession.updateMany({
			where: { id: session.id, revision: input.revision, status: "processing" },
			data: { status: "awaiting" },
		});
		throw error;
	}
}

export async function cancelSalesRequestClarification(
	db: ClarificationDatabase,
	sessionId: string,
	actorUserId: number,
) {
	await ownedClarification(db, sessionId, actorUserId);
	await db.salesRequestClarificationSession.updateMany({
		where: { id: sessionId, actorUserId },
		data: { status: "cancelled" },
	});
	return { cancelled: true };
}
export async function listSalesRequestClarificationGuidance(
	db: ClarificationDatabase,
	actorUserId: number,
) {
	const rows = await db.salesRequestClarificationSession.findMany({
		where: { actorUserId, status: "complete" },
		orderBy: { updatedAt: "desc" },
		take: 50,
	});
	return rows.flatMap((row) =>
		(row.answers as Answer[])
			.filter((answer) => answer.reuse)
			.map((answer) => ({ ...answer, sessionId: row.id, scope: row.scope })),
	);
}
export async function setSalesRequestClarificationGuidance(
	db: ClarificationDatabase,
	actorUserId: number,
	input: {
		sessionId: string;
		questionId: string;
		active: boolean;
		answer?: string;
	},
) {
	const row = await ownedClarification(db, input.sessionId, actorUserId);
	const answers = row.answers as Answer[];
	if (
		row.status !== "complete" ||
		!answers.some(
			(answer) => answer.questionId === input.questionId && answer.reuse,
		)
	)
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Reusable answer not found.",
		});
	const updated = await db.salesRequestClarificationSession.updateMany({
		where: { id: row.id, revision: row.revision, status: "complete" },
		data: {
			revision: row.revision + 1,
			answers: answers.map((answer) =>
				answer.questionId === input.questionId
					? {
							...answer,
							active: input.active,
							...(input.answer ? { answer: input.answer } : {}),
						}
					: answer,
			),
		},
	});
	if (updated.count !== 1) conflict("Guidance changed. Reload before editing.");
	return { updated: true };
}
