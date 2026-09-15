import { expect, test } from "bun:test";
import {
	beginSalesRequestClarification,
	answerSalesRequestClarification,
	ownedClarification,
	clarificationSourceReference,
	reusableClarification,
	readClarificationGuidance,
	type ClarificationDatabase,
} from "./sales-request-clarification";
function memoryDb() {
	const rows = new Map<string, any>();
	const matches = (row: any, where: any) =>
		Object.entries(where).every(([key, value]) => row[key] === value);
	const db: ClarificationDatabase = {
		salesRequestClarificationSession: {
			create: async ({ data }) => {
				const row = { ...data };
				rows.set(String(data.id), row);
				return row as any;
			},
			findUnique: async ({ where }) =>
				rows.has(where.id) ? structuredClone(rows.get(where.id)) : null,
			findMany: async ({ where }) =>
				[...rows.values()].filter((row) => matches(row, where)),
			updateMany: async ({ where, data }) => {
				const matching = [...rows.values()].filter((row) =>
					matches(row, where),
				);
				matching.forEach((row) => Object.assign(row, data));
				return { count: matching.length };
			},
		},
	};
	return { db, rows };
}
const configuration = {
	schemaVersion: 1 as const,
	routes: [{ itemTypeUid: "door", rootStepId: 1, stepUids: [] }],
	steps: [
		{
			id: 1,
			uid: "type",
			selectionMode: "single" as const,
			components: [["door", "Door"]],
		},
	],
	visibilityByComponentUid: {},
};
const snapshot = {
	settingId: 3,
	scope: "sales-settings:3",
	revision: "one",
	configurationJson: JSON.stringify(configuration),
	configuration: {
		...configuration,
		steps: configuration.steps.map((step) => ({
			...step,
			title: step.uid,
			components: step.components.map(([uid, title]) => ({
				uid: uid!,
				title: title!,
			})),
		})),
	},
	aiSelection: { provider: "openai" as const, model: "gpt-5-mini" },
	pilotSettingsRevision: 1,
	providerBenchmarkApprovalRevision: 1,
};
test("two rounds retain exact source and answers; owner and stale replay rejected", async () => {
	const { db, rows } = memoryDb();
	let calls = 0;
	const requests: any[] = [];
	const dependencies = {
		authorize: async () => {},
		reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		telemetry: {
			beginRun: async () => {},
			markProviderAttempted: async () => {},
			completeRun: async () => {},
		},
		createProvider: () => async (input: any) => {
			requests.push(input);
			calls++;
			return {
				output: {
					schemaVersion: 1,
					lineItems: [
						{
							uid: "line-1",
							qty: 1,
							formSteps: [{ stepId: 1, prodUid: "door" }],
						},
					],
					unresolved:
						calls < 3
							? [
									{
										lineUid: null,
										stepId: null,
										field: calls === 1 ? "material" : "finish",
										status: "ambiguous",
										reason:
											calls === 1
												? 'Which material does "standard door" mean?'
												: 'Which finish does "standard door" mean?',
									},
								]
							: [],
				},
			};
		},
	};
	const source = "  one standard door\n";
	const signal = new AbortController().signal;
	const first = await beginSalesRequestClarification({
		db,
		actorUserId: 7,
		type: "order",
		text: source,
		signal,
		dependencies,
	});
	const c = first.clarification!;
	await expect(ownedClarification(db, c.sessionId, 8)).rejects.toThrow(
		"not found",
	);
	const second = await answerSalesRequestClarification({
		db,
		actorUserId: 7,
		sessionId: c.sessionId,
		revision: 1,
		answers: [{ questionId: c.questions[0]!.id, answer: "pine", reuse: false }],
		signal,
		dependencies,
	});
	expect(second.clarification?.round).toBe(2);
	await expect(
		answerSalesRequestClarification({
			db,
			actorUserId: 7,
			sessionId: c.sessionId,
			revision: 1,
			answers: [],
			signal,
			dependencies,
		}),
	).rejects.toThrow("changed");
	const third = await answerSalesRequestClarification({
		db,
		actorUserId: 7,
		sessionId: c.sessionId,
		revision: 2,
		answers: [
			{
				questionId: second.clarification!.questions[0]!.id,
				answer: "primed",
				reuse: true,
			},
		],
		signal,
		dependencies,
	});
	expect(third.clarification).toBeNull();
	expect(calls).toBe(3);
	expect(rows.get(c.sessionId).sourceText).toBe(source);
	expect(rows.get(c.sessionId).answers).toHaveLength(2);
	const guidance = await readClarificationGuidance(db, {
		actorUserId: 7,
		scope: snapshot.scope,
		configurationRevision: "one",
		text: "another standard door",
	});
	expect(guidance.map((a) => a.answer)).toEqual(["primed"]);
	expect(
		await readClarificationGuidance(db, {
			actorUserId: 8,
			scope: snapshot.scope,
			configurationRevision: "one",
			text: "another standard door",
		}),
	).toEqual([]);
	expect(
		await readClarificationGuidance(db, {
			actorUserId: 7,
			scope: snapshot.scope,
			configurationRevision: "one",
			text: "different product",
		}),
	).toEqual([]);
});

test("numeric quantity answers are never reusable even when checkbox is checked", async () => {
	const { db, rows } = memoryDb();
	const question = {
		id: "q",
		lineUid: null,
		field: "door product",
		question: "Which door?",
		sourceText: "standard door",
		reason: "Which door?",
	};
	rows.set("s", {
		id: "s",
		actorUserId: 7,
		scope: snapshot.scope,
		configurationRevision: "one",
		status: "complete",
		answers: [
			{
				questionId: "q",
				answer: "20 pieces",
				reuse: true,
				active: true,
				question,
			},
		],
	});
	expect(
		await readClarificationGuidance(db, {
			actorUserId: 7,
			scope: snapshot.scope,
			configurationRevision: "one",
			text: "standard door",
		}),
	).toEqual([]);
	rows.get("s").answers[0].answer = "pine";
	rows.set("s2", {
		...rows.get("s"),
		id: "s2",
		answers: [
			{ questionId: "q", answer: "oak", reuse: true, active: true, question },
		],
	});
	expect(
		await readClarificationGuidance(db, {
			actorUserId: 7,
			scope: snapshot.scope,
			configurationRevision: "one",
			text: "standard door",
		}),
	).toEqual([]);
});

test("cancellation during regeneration cannot publish another questionnaire", async () => {
	const { db, rows } = memoryDb();
	const question = {
		id: "question",
		lineUid: null,
		field: "finish",
		question: "Which finish?",
		sourceText: "standard door",
		reason: "Confirm finish",
	};
	rows.set("session", {
		id: "session",
		actorUserId: 7,
		saleType: "order",
		scope: snapshot.scope,
		configurationRevision: "one",
		sourceText: "standard door",
		revision: 1,
		status: "awaiting",
		questions: [question],
		answers: [],
	});
	const dependencies = {
		authorize: async () => {},
		reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		telemetry: {
			beginRun: async () => {},
			markProviderAttempted: async () => {},
			completeRun: async () => {},
		},
		createProvider: () => async () => {
			rows.get("session").status = "cancelled";
			return {
				output: {
					schemaVersion: 1,
					lineItems: [
						{
							uid: "line-1",
							qty: 1,
							formSteps: [{ stepId: 1, prodUid: "door" }],
						},
					],
					unresolved: [],
				},
			};
		},
	};
	await expect(
		answerSalesRequestClarification({
			db,
			actorUserId: 7,
			sessionId: "session",
			revision: 1,
			answers: [{ questionId: "question", answer: "primed", reuse: true }],
			signal: new AbortController().signal,
			dependencies,
		}),
	).rejects.toThrow("cancelled");
	expect(rows.get("session").status).toBe("cancelled");
	expect(rows.get("session").revision).toBe(1);
});

test("digits in an exact catalog title do not turn an alias into a quantity default", () => {
	const answer = {
		questionId: "q",
		answer: "BASEBOARD WM713",
		reuse: true,
		active: true,
		question: {
			id: "q",
			lineUid: null,
			field: "product",
			question: "Which product?",
			sourceText: "standard base",
			reason: "Which product?",
		},
	};
	expect(
		reusableClarification(answer, "standard base", ["BASEBOARD WM713"]),
	).toBe(true);
	expect(
		reusableClarification({ ...answer, answer: "20 pieces" }, "standard base", [
			"BASEBOARD WM713",
		]),
	).toBe(false);
	expect(
		reusableClarification(
			{ ...answer, question: { ...answer.question, field: "quantity" } },
			"standard base",
			["BASEBOARD WM713"],
		),
	).toBe(false);
});

test("unquoted source reference requires an actual catalog title in both request and question", () => {
	expect(
		clarificationSourceReference(
			"Confirm quantity for BASEBOARD WM713",
			"Please quote Baseboard WM713",
			["BASEBOARD WM713 "],
		),
	).toBe("Baseboard WM713");
	expect(
		clarificationSourceReference(
			"Confirm quantity for BASEBOARD WM713",
			"Please quote standard base",
			["BASEBOARD WM713"],
		),
	).toBeNull();
	expect(
		clarificationSourceReference(
			"Confirm quantity",
			"Please quote BASEBOARD WM713",
			["BASEBOARD WM713"],
		),
	).toBeNull();
});
