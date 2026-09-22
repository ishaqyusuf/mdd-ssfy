import { expect, test } from "bun:test";
import { newSalesFormSeedSchema } from "@gnd/sales/sales-form-core";
import { SalesRequestProviderExecutionError } from "./sales-request-provider";
import {
	beginSalesRequestClarification,
	answerSalesRequestClarification,
	ownedClarification,
	clarificationSourceReference,
	clarificationQuestionAllowsOther,
	reusableClarification,
	readClarificationGuidance,
	recordSalesRequestInterpretationWarnings,
	listSalesRequestInterpretationWarnings,
	reviewDenseArchitecturalSchedule,
	setSalesRequestInterpretationWarningGuidance,
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

test("current step custom metadata controls catalog Other, while fact answers stay free text", () => {
	const catalogQuestion = {
		id: "old-question", lineUid: "line-1", field: "type",
		question: "Which type?", sourceText: null, reason: "Choose a type.",
		options: [{ value: "Door", label: "Door" }],
	};
	expect(clarificationQuestionAllowsOther(catalogQuestion, snapshot.configuration)).toBe(false);
	expect(clarificationQuestionAllowsOther(catalogQuestion, {
		...snapshot.configuration,
		steps: snapshot.configuration.steps.map((step) => ({ ...step, custom: true as const })),
	})).toBe(true);
	expect(clarificationQuestionAllowsOther({ ...catalogQuestion, field: "handing",
		options: [{ value: "all left", label: "All left" }] }, snapshot.configuration)).toBe(true);
	expect(clarificationQuestionAllowsOther({ ...catalogQuestion, field: "width", lineUid: null,
		options: [{ value: "28 inches", label: "28 inches" }] }, snapshot.configuration)).toBe(true);
	expect(clarificationQuestionAllowsOther({ ...catalogQuestion, field: "doorSize", stepId: 1,
		options: [{ value: "2-8 x 6-8", label: "2-8 x 6-8" }] }, snapshot.configuration)).toBe(false);
	expect(clarificationQuestionAllowsOther({ ...catalogQuestion, field: "width", stepId: 1,
		options: [{ value: "2-8 x 6-8", label: "2-8 x 6-8" }] }, {
		...snapshot.configuration,
		steps: [...snapshot.configuration.steps, { id: 2, uid: "door-size", title: "Door Size",
			selectionMode: "single" as const, components: [], doorSizeVariation: [{ rules: [], widthList: ["2-8"] }] }],
	})).toBe(false);
});

test("a non-custom catalog step rejects arbitrary text before claiming or calling the provider", async () => {
	const { db, rows } = memoryDb();
	const question = {
		id: "catalog-question", lineUid: "line-1", field: "type",
		question: "Which type?", sourceText: null, reason: "Choose a type.",
		options: [{ value: "Door", label: "Door" }],
	};
	rows.set("session", {
		id: "session", actorUserId: 7, saleType: "order", scope: snapshot.scope,
		configurationRevision: snapshot.revision, sourceText: "One door", revision: 1,
		status: "awaiting", questions: [question], answers: [],
	});
	let providerCalls = 0;
	await expect(answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: "session", revision: 1,
		answers: [{ questionId: question.id, answer: "invented door", reuse: false }],
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => { providerCalls++; throw new Error("Unexpected provider call"); },
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	})).rejects.toThrow("Choose a configured option");
	expect(rows.get("session").status).toBe("awaiting");
	expect(rows.get("session").answers).toEqual([]);
	expect(providerCalls).toBe(0);
});

test("an explicit first-compatible answer resolves to the first configured option", async () => {
	const { db, rows } = memoryDb();
	const question = {
		id: "catalog-question", lineUid: "line-1", field: "type",
		question: "Which type?", sourceText: null, reason: "Choose a type.",
		options: [{ value: "Door", label: "Door" }],
	};
	rows.set("session", {
		id: "session", actorUserId: 7, saleType: "order", scope: snapshot.scope,
		configurationRevision: snapshot.revision, sourceText: "One door", revision: 1,
		status: "awaiting", questions: [question], answers: [],
	});
	let submittedAnswer: string | undefined;
	await expect(answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: "session", revision: 1,
		answers: [{ questionId: question.id,
			answer: "Use the first compatible Sales product", reuse: false }],
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async (input) => {
				submittedAnswer = input.clarifications?.[0]?.answer;
				throw new Error("stop after inspecting clarification");
			},
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	})).rejects.toThrow("could not generate a request preview");
	expect(submittedAnswer).toBe("Door");
	expect(rows.get("session").status).toBe("awaiting");
});

test("dense Carrara schedule keeps missing source facts as questions and catalog gaps as review notes", async () => {
	const source = await Bun.file(new URL(
		"../../../../.brain/evaluations/sales-request-generation/cases/spanish-carrara-door-package/input.md",
		import.meta.url,
	)).text();
	const unresolved = [
		{ field: "door", reason: "Confirm compatible Door product for 2-8 x 8-0." },
		{ field: "doorSize", reason: "Requested 2-8 x 8-0 is unavailable for this route." },
		{ field: "doorSize", reason: "This door size was not stated." },
		{ field: "jambSize", reason: "Confirm the catalog jamb." },
		{ field: "handing", reason: "Confirm handing." },
		{ field: "height", reason: "Requested 8-8 height is unavailable." },
		{ field: "width", reason: 'Confirm whether "28 8/0 RH" means 28 inches or 2-8.' },
		{ field: "Door stop quantity", reason: "Confirm Door stop (6)." },
		{ field: "Moulding quantities", reason: "Confirm base, casing and crown products." },
		{ field: "Pocket door hardware", reason: "Confirm the pocket hardware product." },
	].map((item) => ({ ...item, lineUid: null, stepId: null,
		status: "ambiguous" as const }));
	const seed = { schemaVersion: 2 as const, lineItems: [], unresolved };
	const preview = { seed } as Parameters<typeof reviewDenseArchitecturalSchedule>[0];
	const projected = reviewDenseArchitecturalSchedule(preview, source);
	const statuses = projected.seed.unresolved.map((item) => item.status);
	// A missing dimension and the literal 28-width ambiguity still need an answer.
	// Catalog matches and source-stated quantities remain visible for Sales review.
	expect(statuses).toEqual([
		"unsupported", "unsupported", "ambiguous", "unsupported", "unsupported",
		"unsupported", "ambiguous", "unsupported", "unsupported", "unsupported",
	]);
	expect(projected.seed.lineItems).toBe(seed.lineItems);
	expect(projected.seed.unresolved[6]?.reason).toContain("28 8/0 RH");
	expect(reviewDenseArchitecturalSchedule(preview, "2/8 8/0 RH garage door"))
		.toBe(preview);
	const withoutWidth = { seed: { ...seed, unresolved: unresolved.filter((item) =>
		item.field !== "width") } } as Parameters<typeof reviewDenseArchitecturalSchedule>[0];
	const withWidth = reviewDenseArchitecturalSchedule(withoutWidth, source);
	expect(withWidth.seed.unresolved.filter((item) =>
		item.field === "width" && item.status === "ambiguous")).toHaveLength(1);
	expect(reviewDenseArchitecturalSchedule(withWidth, source).seed.unresolved)
		.toHaveLength(withWidth.seed.unresolved.length);
	const answeredWidth = {
		questionId: "width", answer: "28 inches", reuse: false, active: true,
		question: {
			id: "width", lineUid: null, field: "width", question: "Confirm width",
			sourceText: "28 8/0 RH", reason: "Confirm width",
		},
	};
	expect(reviewDenseArchitecturalSchedule(withoutWidth, source, [answeredWidth])
		.seed.unresolved.some((item) => item.field === "width")).toBe(false);
});

test("a line-scoped Door size question does not borrow another row's handing", async () => {
	const { db } = memoryDb();
	const source = "2/8 8/0 RH garage door\n2/8 8/0 LH interior door";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2,
				lineItems: [
					{ uid: "line-1", qty: 1, formSteps: [{ stepId: 1, prodUid: "door" }] },
					{ uid: "line-2", qty: 1, formSteps: [{ stepId: 1, prodUid: "door" }] },
				],
				unresolved: [{ lineUid: "line-2", stepId: null, field: "door",
					status: "ambiguous", reason: "Confirm a compatible Door product. Requested 1 door at 2-8 x 8-0." }],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification?.questions[0]?.question)
		.toBe("Confirm the Door product/style for the 2-8 x 8-0 door.");
});

test("grouped Bifold door-type questions identify every source size in one answer", async () => {
	const { db } = memoryDb();
	const source = "Bifold 2/0 8/0\nBifold 2/4 8/0\nBifold 2/4 8/0\nBifold 6/0 8/0\nBifold 2/0 8/0\nBifold 5/0 8/0";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2,
				lineItems: [{ uid: "line-3", qty: 6, formSteps: [{ stepId: 1, prodUid: "door" }] }],
				unresolved: ["2/0", "2/4", "6/0", "5/0"].map((size) => ({
					lineUid: "line-3", stepId: null, field: "doorType", status: "ambiguous",
					reason: `Door Type is not specified for the Bifold ${size} 8/0 line.`,
				})),
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	const questions = preview.clarification?.questions ?? [];
	expect(questions).toHaveLength(1);
	expect(questions[0]?.question).toBe(
		"Which door type applies to the Bifold doors (2 × 2/0 × 8/0, 2 × 2/4 × 8/0, 6/0 × 8/0, 5/0 × 8/0)? If types differ, choose Other and list each size's type.",
	);
});

test("a baseboard question does not assert an unstated stock length", async () => {
	const { db } = memoryDb();
	const source = "Left Side\n400 linear feet for baseboard\nRight Side\n400 linear feet for baseboard";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2, lineItems: [], unresolved: [
					{ lineUid: null, stepId: null, field: "mouldingProfile", status: "ambiguous",
						reason: "Confirm the catalog-identifying baseboard profile for Left Side: 400 linear feet of baseboard, cut from 16-foot stock." },
				],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification?.questions[0]?.question).toBe(
		"Confirm the baseboard profile and stock length for Left Side: 400 linear feet of baseboard.",
	);
	expect(preview.clarification?.questions[0]?.reason).not.toContain("16-foot");
});

test("duplex moulding questions offer compatible catalog products", async () => {
	const { db } = memoryDb();
	const mouldingConfiguration = {
		...snapshot.configuration,
		routes: [
			...snapshot.configuration.routes,
			{ itemTypeUid: "mouldings", rootStepId: 1, stepUids: ["moulding"] },
		],
		steps: [
			{ ...snapshot.configuration.steps[0]!, components: [
				...snapshot.configuration.steps[0]!.components,
				{ uid: "mouldings", title: "Mouldings" },
			] },
			{ id: 215, uid: "moulding", title: "Moulding",
				selectionMode: "multiple" as const, components: [
					{ uid: "base-713", title: "BASEBOARD WM713 3-1/4 X 9/16 X 16" },
					{ uid: "base-620", title: "BASEBOARD WM620 4-1/4 X 9/16 X 16" },
					{ uid: "board-12", title: "FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12" },
					{ uid: "casing", title: "CASING WM473 2-1/4 X 9/16 X 17" },
				] },
		],
	};
	const source = "Left Side\n400 linear feet for baseboard\n3 = 12” boards\nRight Side\n400 linear feet for baseboard\n4 = 12” boards";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot,
				configuration: mouldingConfiguration,
				configurationJson: JSON.stringify({
					...mouldingConfiguration,
					steps: mouldingConfiguration.steps.map((step) => ({
						...step,
						components: step.components.map((component) =>
							[component.uid, component.title]),
					})),
				}),
			}),
			createProvider: () => async () => { throw new SalesRequestProviderExecutionError({
				stage: "structured-output", structuredOutputCause: "schema-validation",
			}); },
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	const questions = preview.clarification?.questions ?? [];
	expect(questions.map((question) => question.field)).toEqual([
		"mouldingProfile", "boardProduct",
	]);
	expect(questions[0]?.options).toEqual([
		{ value: "BASEBOARD WM713 3-1/4 X 9/16 X 16", label: "BASEBOARD WM713 3-1/4 X 9/16 X 16" },
		{ value: "BASEBOARD WM620 4-1/4 X 9/16 X 16", label: "BASEBOARD WM620 4-1/4 X 9/16 X 16" },
	]);
	expect(questions[1]?.options).toEqual([{ value:
		"FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12", label:
		"FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12" }]);
	expect(questions.map((question) => question.allowOther)).toEqual([false, false]);
});

test("provider-success broad concerns become review notes plus source-grounded questions", async () => {
	const { db } = memoryDb();
	const mouldingConfiguration = {
		...snapshot.configuration,
		routes: [
			...snapshot.configuration.routes,
			{ itemTypeUid: "mouldings", rootStepId: 1, stepUids: ["moulding"] },
		],
		steps: [
			{ ...snapshot.configuration.steps[0]!, components: [
				...snapshot.configuration.steps[0]!.components,
				{ uid: "mouldings", title: "Mouldings" },
			] },
			{ id: 215, uid: "moulding", title: "Moulding",
				selectionMode: "multiple" as const, components: [
					{ uid: "base-713", title: "BASEBOARD WM713 3-1/4 X 9/16 X 16" },
					{ uid: "board-12", title: "FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12" },
				] },
		],
	};
	const source = `Left Side
400 linear feet for baseboard
3 = 12” boards
DOORS
30” LT bedroom
Right Side
400 linear feet for baseboard
4 = 12” boards
DOORS
32” LT bathroom`;
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({ ...snapshot, configuration: mouldingConfiguration }),
			createProvider: () => async () => ({ output: {
				schemaVersion: 2, lineItems: [], unresolved: [
					{ lineUid: null, stepId: null, field: "moulding", status: "ambiguous",
						reason: "Confirm the twelve-inch board product and Left Side attic access moulding." },
					{ lineUid: null, stepId: null, field: "moulding", status: "ambiguous",
						reason: "Confirm the baseboard and Right Side attic access moulding." },
					{ lineUid: null, stepId: null, field: "doors", status: "ambiguous",
						reason: "Confirm the products for the door schedule." },
				],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	const questions = preview.clarification?.questions ?? [];
	expect(questions.map((question) => question.field)).toEqual([
		"height", "mouldingProfile", "boardProduct",
	]);
	expect(questions[1]?.options?.[0]?.value).toBe(
		"BASEBOARD WM713 3-1/4 X 9/16 X 16",
	);
	expect(questions[2]?.options?.[0]?.value).toBe(
		"FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12",
	);
	expect(preview.seed.unresolved.slice(0, 3).map((item) => item.status)).toEqual([
		"unsupported", "unsupported", "unsupported",
	]);
});

test("exact moulding answers create section-preserving native rows after regeneration", async () => {
	const { db, rows } = memoryDb();
	const mouldingConfiguration = {
		...snapshot.configuration,
		routes: [
			...snapshot.configuration.routes,
			{ itemTypeUid: "mouldings", rootStepId: 1, stepUids: ["moulding"] },
		],
		steps: [
			{ ...snapshot.configuration.steps[0]!, components: [
				...snapshot.configuration.steps[0]!.components,
				{ uid: "mouldings", title: "Mouldings" },
			] },
			{ id: 215, uid: "moulding", title: "Moulding",
				selectionMode: "multiple" as const, components: [
					{ uid: "base-713", title: "BASEBOARD WM713 3-1/4 X 9/16 X 16" },
					{ uid: "board-12", title: "FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12" },
				] },
		],
	};
	const source = "Left Side\n400 linear feet for baseboard\n3 = 12” boards\nRight Side\n400 linear feet for baseboard\n4 = 12” boards";
	const questions = [
		{ id: "profile", lineUid: null, field: "mouldingProfile",
			question: "Which baseboard?", sourceText: "baseboard", reason: "Choose baseboard.",
			options: [{ value: "BASEBOARD WM713 3-1/4 X 9/16 X 16",
				label: "BASEBOARD WM713 3-1/4 X 9/16 X 16" }], allowOther: false },
		{ id: "board", lineUid: null, field: "boardProduct",
			question: "Which board?", sourceText: "12” boards", reason: "Choose board.",
			options: [{ value: "FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12",
				label: "FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12" }], allowOther: false },
	];
	rows.set("session", {
		id: "session", actorUserId: 7, saleType: "order", scope: snapshot.scope,
		configurationRevision: snapshot.revision, sourceText: source, revision: 1,
		status: "awaiting", questions, answers: [],
	});
	const preview = await answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: "session", revision: 1,
		answers: [
			{ questionId: "profile", answer: "BASEBOARD WM713 3-1/4 X 9/16 X 16", reuse: false },
			{ questionId: "board", answer: "FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12", reuse: false },
		],
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot,
				configuration: mouldingConfiguration,
				configurationJson: JSON.stringify({
					...mouldingConfiguration,
					steps: mouldingConfiguration.steps.map((step) => ({
						...step,
						components: step.components.map((component) =>
							[component.uid, component.title]),
					})),
				}),
			}),
			createProvider: () => async () => ({ output: {
				schemaVersion: 2, lineItems: [
					"moulding-left", "board-left", "moulding-right", "board-right",
				].map((uid) => uid === "moulding-left" ? ({
					uid, qty: 25,
					formSteps: [
						{ stepId: 1, prodUid: "mouldings" },
						{ stepId: 215, meta: { selectedProdUids: ["base-713"] } },
					],
					meta: { mouldingRows: [{ uid: "base-713", calculation: {
						linearFeet: 400, pieceLength: 16,
					} }] },
				}) : ({
					uid, qty: 1,
					formSteps: [{ stepId: 1, prodUid: "mouldings" }],
				})), unresolved: [
					{ lineUid: "moulding-left", stepId: null, field: "mouldingProfile", status: "ambiguous",
						reason: "Confirm the selected baseboard." },
					{ lineUid: "board-left", stepId: 215, field: "finish", status: "ambiguous",
						reason: "Confirm any remaining board finish." },
					{ lineUid: null, stepId: null, field: "moulding", status: "ambiguous",
						reason: "Confirm moulding products for both sections." },
					{ lineUid: null, stepId: null, field: "mouldingProfile", status: "unsupported",
						reason: "BASEBOARD WM713 3-1/4 X 9/16 X 16 is not present in CONFIGURATION. Please provide a substitution." },
					{ lineUid: null, stepId: null, field: "boardProduct", status: "unsupported",
						reason: "FLAT BOARD (11-1/4 X 11/16 X 16) PRIMED FJ S4S 1 X 12 is not found in CONFIGURATION. Please provide a substitution." },
				], interpretations: [{
					lineUid: "moulding-left", stepId: 215, field: "mouldingProfile",
					sourceText: "baseboard", selectedProdUid: "base-713",
					selectedTitle: "BASEBOARD WM713 3-1/4 X 9/16 X 16",
					reason: "Matched the requested baseboard.",
				}],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.lineItems).toHaveLength(4);
	expect(preview.seed.lineItems.map((line) => line.qty)).toEqual([25, 3, 25, 4]);
	expect(preview.seed.lineItems.map((line) =>
		line.meta?.mouldingRows?.[0]?.uid)).toEqual([
		"base-713", "board-12", "base-713", "board-12",
	]);
	expect(preview.seed.lineItems.filter((line) =>
		line.meta?.mouldingRows?.[0]?.uid === "base-713").map((line) =>
		line.meta?.mouldingRows?.[0])).toEqual([
		{ uid: "base-713", qty: 25,
			calculation: { linearFeet: 400, pieceLength: 16, wastePercentage: 0 } },
		{ uid: "base-713", qty: 25,
			calculation: { linearFeet: 400, pieceLength: 16, wastePercentage: 0 } },
	]);
	expect(preview.seed.lineItems.map((line) => line.formSteps[1])).toEqual([
		{ stepId: 215, meta: { selectedProdUids: ["base-713"] } },
		{ stepId: 215, meta: { selectedProdUids: ["board-12"] } },
		{ stepId: 215, meta: { selectedProdUids: ["base-713"] } },
		{ stepId: 215, meta: { selectedProdUids: ["board-12"] } },
	]);
	expect(newSalesFormSeedSchema.safeParse(preview.seed).success).toBe(true);
	expect(preview.seed.unresolved.some((item) => item.lineUid === "moulding-left" ||
		item.lineUid === "board-left")).toBe(false);
	expect(preview.seed.unresolved).toContainEqual({
		lineUid: null,
		stepId: null,
		field: "finish",
		status: "unsupported",
		reason: "Confirm any remaining board finish.",
	});
	expect(preview.seed.unresolved.some((item) =>
		item.reason.includes("provide a substitution"))).toBe(false);
	expect(preview.seed.interpretations?.[0]?.lineUid).toMatch(
		/^clarified-left-side-mouldingprofile-/,
	);
});

test("duplex attic-access configuration gaps stay in review while missing route facts can still be asked", async () => {
	const { db } = memoryDb();
	const source = "Left Side\n1 ATTIC ACCESS\n30” LT = 1st BEDROOM\nRight Side\n1 ATTIC ACCESS\n32” LT = 1st BEDROOM";
	const prehungSnapshot = { ...snapshot, configuration: {
		...snapshot.configuration,
		routes: [{ itemTypeUid: "door", rootStepId: 1, stepUids: [], config: { noHandle: false } }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single" as const,
			components: [{ uid: "door", title: "Interior pre-hung" }] }],
	} };
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => prehungSnapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2,
				lineItems: ["attic-access-left", "attic-access-right"].map((uid) => ({
					uid, qty: 1, formSteps: [{ stepId: 1, prodUid: "door" }],
				})),
				unresolved: [
					...(["attic-access-left", "attic-access-right"] as const).flatMap((lineUid) => [
						{ lineUid, stepId: null, field: "jambSize", status: "ambiguous", reason: "Confirm jamb size." },
						{ lineUid, stepId: null, field: "handing", status: "ambiguous", reason: "Confirm handing." },
					]),
					{ lineUid: null, stepId: null, field: "door schedule", status: "ambiguous",
						reason: "The Left Side and Right Side door schedules list widths and handing with no heights or per-row counts; provide heights and quantities per door." },
				],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	const questions = preview.clarification?.questions ?? [];
	expect(questions.filter((question) => question.field === "jambSize")).toEqual([]);
	expect(questions.filter((question) => question.field === "handing")).toEqual([]);
	expect(questions.find((question) => question.field === "door schedule")?.question)
		.toContain("What height applies to the listed doors");
	expect(preview.seed.unresolved.filter((item) =>
		item.field === "jambSize" || item.field === "handing",
	).every((item) => item.status === "unsupported")).toBe(true);
});

test("a broad townhouse schedule question asks only source-missing facts", async () => {
	const { db } = memoryDb();
	const source = `Master Water Closet -\nLaundry Entry - 34" x 96" x 1-3/4 R In\nCabana Bathroom - 30' x 96" - PVC Louvered R In`;
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2, lineItems: [], unresolved: [
					{ lineUid: null, stepId: null, field: "doors", status: "ambiguous",
						reason: "Confirm all 24 door rows: no product matching 96-inch (8-0) height, only 6-8, 7-0 and 8-0 exposed." },
				],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification?.questions.map((question) => question.question)).toEqual([
		"What size is the Master Water Closet door?",
		"Confirm the intended width and unit for Cabana Bathroom: the source says 30' x 96\".",
	]);
	expect(preview.clarification?.questions.map((question) => question.sourceText)).toEqual([
		"Master Water Closet -", "Cabana Bathroom - 30' x 96\" - PVC Louvered R In",
	]);
	expect(preview.clarification?.questions.map((question) => question.reason).join(" "))
		.not.toContain("24 door rows");
	expect(preview.seed.unresolved.find((item) => item.field === "doors"))
		.toMatchObject({ status: "unsupported" });
	const answered = await answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: preview.clarification!.sessionId,
		revision: preview.clarification!.revision,
		answers: preview.clarification!.questions.map((question, index) => ({
			questionId: question.id, answer: index === 0 ? "32 x 96 inches" : "30 inches", reuse: false,
		})),
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2, lineItems: [], unresolved: [
					{ lineUid: null, stepId: null, field: "doors", status: "ambiguous",
						reason: "Confirm all 24 door rows: no product matching 96-inch (8-0) height." },
				],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(answered.clarification).toBeNull();
	expect(answered.seed.unresolved).toEqual([
		{ lineUid: null, stepId: null, field: "doors", status: "unsupported",
			reason: "Review the remaining door product and assembly matches against the source schedule." },
	]);
});

test("dense named-room rows ask only for a missing size and keep a likely inch typo in Sales review", async () => {
	const { db } = memoryDb();
	const source = [
		"Master Water Closet -",
		...Array.from({ length: 8 }, (_, index) => `Room ${index + 1} - 34\" x 96\"`),
		"Cabana Bathroom - 30' x 96\" - PVC Louvered R In",
	].join("\n");
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2, lineItems: [], unresolved: [
					{ lineUid: null, stepId: null, field: "Master Water Closet", status: "ambiguous", reason: "Confirm the missing room details." },
					{ lineUid: null, stepId: null, field: "schedule", status: "ambiguous", reason: "No door product, door type, configuration, or item type was specified for the entire 'Townhouse door package' schedule." },
					{ lineUid: null, stepId: null, field: "door", status: "ambiguous", reason: "Select a catalog Door product." },
					{ lineUid: null, stepId: null, field: "jambSize", status: "ambiguous", reason: "Confirm a catalog jamb." },
					{ lineUid: null, stepId: null, field: "handing", status: "ambiguous", reason: "Confirm handing." },
					{ lineUid: null, stepId: null, field: "doorSize", status: "ambiguous", reason: "Confirm 34 x 96." },
				],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification?.questions.map((question) => question.question)).toEqual([
		"What size is the Master Water Closet door?",
	]);
	expect(preview.seed.unresolved.filter((item) =>
		["door", "jambSize", "handing", "doorSize", "doors"].includes(item.field),
	).every((item) => item.status === "unsupported")).toBe(true);
});

test("dense named-room product identity aliases stay in Sales review", async () => {
	const { db } = memoryDb();
	const sizedRows = [
		...Array.from({ length: 20 }, (_, index) =>
			`Townhouse Room ${String(index + 1).padStart(2, "0")} - 34\" x 96\"`),
		"Cabana Bathroom - 30' x 96\" - PVC Louvered R In",
	];
	const source = ["Master Water Closet -", ...sizedRows].join("\n");
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2,
				lineItems: sizedRows.map((_, index) => ({
					uid: `townhouse-room-${String(index + 1).padStart(2, "0")}`,
					qty: 1, formSteps: [{ stepId: 1, prodUid: "door" }],
				})),
				unresolved: sizedRows.map((_, index) => ({
					lineUid: `townhouse-room-${String(index + 1).padStart(2, "0")}`,
					stepId: null, field: "doorType", status: "ambiguous" as const,
					reason: "Confirm the door type for this request.",
				})),
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {},
				completeRun: async () => {} },
		},
	});

	expect(preview.clarification?.questions.map((question) => question.question)).toEqual([
		"What size is the Master Water Closet door?",
	]);
	expect(preview.seed.unresolved.filter((item) => item.field === "doorType"))
		.toHaveLength(21);
	expect(preview.seed.unresolved.filter((item) => item.field === "doorType")
		.every((item) => item.status === "unsupported")).toBe(true);
});

test("a failed townhouse provider attempt asks only the two source-known questions", async () => {
	const { db } = memoryDb();
	const source = `Master Water Closet - \nLaundry Entry - 34" x 96"\nCabana Bathroom - 30' x 96" - PVC Louvered R In`;
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => { throw new SalesRequestProviderExecutionError({
				stage: "structured-output", structuredOutputCause: "schema-validation",
			}); },
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.seed.lineItems).toEqual([]);
	expect(preview.clarification?.questions.map((question) => question.question)).toEqual([
		"What size is the Master Water Closet door?",
		"Confirm the intended width and unit for Cabana Bathroom: the source says 30' x 96\".",
	]);
});

test("a failed dense townhouse attempt retains one review occurrence per named source row", async () => {
	const { db } = memoryDb();
	const namedRows = [
		"Master Water Closet -",
		...Array.from({ length: 22 }, (_, index) =>
			`Townhouse Room ${String(index + 1).padStart(2, "0")} - 34\" x 96\"`),
		"Cabana Bathroom - 30' x 96\" - PVC Louvered R In",
	];
	const dependencies = {
		authorize: async () => {}, reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		createProvider: () => async () => { throw new SalesRequestProviderExecutionError({
			stage: "structured-output" as const, structuredOutputCause: "schema-validation" as const,
		}); },
		telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {},
			completeRun: async () => {} },
	};
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: namedRows.join("\n"),
		signal: new AbortController().signal, dependencies,
	});

	expect(preview.seed.lineItems).toEqual([]);
	expect(preview.clarification?.questions.map((question) => question.question)).toEqual([
		"What size is the Master Water Closet door?",
	]);
	expect(namedRows.map((row) => {
		const room = row.split(/\s+-\s*/)[0]!;
		return preview.seed.unresolved.filter((item) => item.reason.includes(room)).length;
	})).toEqual(Array(namedRows.length).fill(1));

	const answered = await answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: preview.clarification!.sessionId,
		revision: preview.clarification!.revision,
		answers: [{ questionId: preview.clarification!.questions[0]!.id,
			answer: "32 x 96 inches", reuse: false }],
		signal: new AbortController().signal, dependencies,
	});
	expect(answered.clarification).toBeNull();
	expect(namedRows.map((row) => {
		const room = row.split(/\s+-\s*/)[0]!;
		return answered.seed.unresolved.filter((item) => item.reason.includes(room)).length;
	})).toEqual(Array(namedRows.length).fill(1));
	const masterReviews = answered.seed.unresolved.filter((item) =>
		item.reason.includes("Master Water Closet"));
	expect(masterReviews).toHaveLength(1);
	expect(masterReviews[0]?.reason).toContain("32 x 96 inches");
	expect(answered.seed.unresolved.every((item) => item.status === "unsupported")).toBe(true);
});

test("a named room line keeps its missing configuration in review once a route exists", async () => {
	const { db } = memoryDb();
	const source = "Master Water Closet - \nCabana Bathroom - 30' x 96\" - PVC Louvered R In";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2,
				lineItems: [{ uid: "master-water-closet", qty: 1,
					formSteps: [{ stepId: 1, prodUid: "door" }] }],
				unresolved: [{ lineUid: "master-water-closet", stepId: null,
					field: "door", status: "ambiguous",
					reason: "The Master Water Closet entry has no dimensions or door details. Confirm the size, door type, and handing." }],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved[0]).toMatchObject({
		field: "door", status: "unsupported",
	});
});

test("bare schedule width offers source-preserving inch and architectural choices", async () => {
	const { db } = memoryDb();
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: "28 8/0 RH",
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 2, lineItems: [],
				unresolved: [{ lineUid: null, stepId: null, field: "width", status: "ambiguous",
					reason: 'Confirm the width for "28 8/0 RH": does 28 mean inches or architectural feet/inches?' }],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification?.questions[0]?.options).toEqual([
		{ value: "28 inches", label: "28 inches (2-4)" },
		{ value: "2-8", label: "2-8 (32 inches)" },
	]);
	expect(preview.clarification?.questions[0]?.canSaveRule).toBe(false);
});

test("a failed dense Carrara request still asks its one source ambiguity", async () => {
	const { db } = memoryDb();
	const source = await Bun.file(new URL(
		"../../../../.brain/evaluations/sales-request-generation/cases/spanish-carrara-door-package/input.md",
		import.meta.url,
	)).text();
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => {
				throw new SalesRequestProviderExecutionError({
					stage: "structured-output", structuredOutputCause: "schema-validation",
				});
			},
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {},
				completeRun: async () => {} },
		},
	});
	expect(preview.seed.lineItems).toEqual([]);
	expect(preview.clarification?.questions.map((question) => question.field))
		.toEqual(["width"]);
	expect(preview.clarification?.questions[0]?.options).toEqual([
		{ value: "28 inches", label: "28 inches (2-4)" },
		{ value: "2-8", label: "2-8 (32 inches)" },
	]);
});

test("a failed dense request asks for source facts without producing a draft or success telemetry", async () => {
	const { db } = memoryDb();
	const statuses: string[] = [];
	const source = `Left Side\n400 linear feet for baseboard\n3 = 12” boards\nDOORS\n30” LT bedroom\nRight Side\n400 linear feet for baseboard\n4 = 12” boards\nDOORS\n32” RT bathroom`;
	const dependencies = {
		authorize: async () => {}, reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		createProvider: () => async () => {
			throw new SalesRequestProviderExecutionError({
				stage: "structured-output", structuredOutputCause: "schema-validation",
			});
		},
		telemetry: {
			beginRun: async () => {}, markProviderAttempted: async () => {},
			completeRun: async (event: { status: string }) => { statuses.push(event.status); },
		},
	};
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal, dependencies,
	});
	expect(preview.seed.lineItems).toEqual([]);
	expect(preview.clarification?.questions.map((question) => question.field)).toEqual([
		"height", "mouldingProfile", "boardProduct",
	]);
	expect(preview.clarification?.questions[1]?.question).toContain("Left: 400 LF; right: 400 LF");
	expect(preview.clarification?.questions[1]?.sourceText).toBe("baseboard");
	expect(preview.clarification?.questions[2]?.question).toContain("Left: 3; right: 4");
	expect(preview.clarification?.questions[2]?.sourceText).toBe("12” boards");
	expect(statuses).toEqual(["provider-error"]);
	await expect(answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: preview.clarification!.sessionId,
		revision: preview.clarification!.revision,
		answers: preview.clarification!.questions.map((question) => ({
			questionId: question.id, answer: "Details supplied", reuse: false,
		})),
		signal: new AbortController().signal, dependencies,
	})).rejects.toThrow("could not generate a request preview");
	expect(statuses).toEqual(["provider-error", "provider-error"]);
});

test("impact sidelite fallback keeps panel and assembly gaps in Sales review", async () => {
	const { db } = memoryDb();
	const source = "Hurricane impact door and sidelite on right. 36” door panel on PVC frame; total size is 69-5/8” x 80”. Include pvc brick molding.";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "quote", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => {
				throw new SalesRequestProviderExecutionError({
					stage: "structured-output", structuredOutputCause: "schema-validation",
				});
			},
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {},
				completeRun: async () => {} },
		},
	});
	expect(preview.seed.lineItems).toEqual([]);
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ field: "height", status: "unsupported" }),
		expect.objectContaining({ field: "pvcJamb", status: "unsupported" }),
		expect.objectContaining({ field: "sideliteAssembly", status: "unsupported" }),
		expect.objectContaining({ field: "pvcBrickMoulding", status: "unsupported" }),
	]));
});

test("an unsupported catalog item remains reviewable without an impossible questionnaire", async () => {
	const { db } = memoryDb();
	const source = "Need a cabinet item outside the configured catalog.";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 1, lineItems: [], unresolved: [{
					lineUid: null, stepId: null, field: "itemType", status: "unsupported",
					reason: "No configured cabinet item type matches this request.",
				}],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved[0]).toMatchObject({ field: "itemType", status: "unsupported" });
});

test("an incomplete model dimension quote stays in review for an existing route", async () => {
	const { db } = memoryDb();
	const source = 'Overall 69-5/8" x 80" with a 36" x 80" door panel.';
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => ({ output: {
				schemaVersion: 1,
				lineItems: [{ uid: "line-1", qty: 1, formSteps: [{ stepId: 1, prodUid: "door" }] }],
				unresolved: [{ lineUid: "line-1", stepId: null, field: "dimensions", status: "ambiguous",
					reason: "Confirm the dimensions for ‘ x 80’." }],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved[0]).toMatchObject({
		field: "dimensions", status: "unsupported",
	});
});

test("questions offer only configured route choices in catalog order with a substantive prompt", async () => {
	const { db } = memoryDb();
	const source = "One left-hand primed white interior pre-hung door, 30 x 80 inches.";
	const routeConfiguration = {
		...snapshot.configuration,
		visibilityByComponentUid: {
			"sc-flush": { variations: [{ rules: [
				{ stepUid: "door-material", operator: "is", componentsUid: ["steel"] },
			] }] },
		},
		routes: [{ itemTypeUid: "door", rootStepId: 1, stepUids: ["door-type"] }],
		steps: [
			...snapshot.configuration.steps,
			{ id: 2, uid: "door-type", title: "Door Type", components: [
				{ uid: "sc-molded", title: "SC Molded" },
				{ uid: "hc-flush", title: "HC Flush" },
				{ uid: "sc-flush", title: "SC Flush" },
				{ uid: "hc-molded", title: "HC Molded" },
			] },
			{ id: 3, uid: "unrelated", title: "Unrelated", components: [{ uid: "other", title: "Not on route" }] },
		],
	};
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot, configuration: routeConfiguration,
				configurationJson: JSON.stringify({
					...routeConfiguration,
					steps: routeConfiguration.steps.map((step) => ({
						...step,
						components: step.components.map((component) => [component.uid, component.title]),
					})),
				}),
			}),
			createProvider: () => async () => ({ output: {
				schemaVersion: 1,
				lineItems: [{ uid: "line-1", qty: 1, formSteps: [{ stepId: 1, prodUid: "door" }] }],
				unresolved: [
					{ lineUid: "line-1", stepId: 2, field: "doorType", status: "ambiguous",
						reason: "Confirm the door type for the primed white interior pre-hung door." },
					{ lineUid: "line-1", stepId: null, field: "height", status: "ambiguous",
						reason: "Cannot resolve 30 x 80 inches (2-6 x 6-8) handed quantities for the selected Height because no compatible Door product was identified; provide a matching door style to compute the left-hand opening." },
				],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	const question = preview.clarification?.questions[0];
	expect(question?.question).toBe("Confirm the door type for the primed white interior pre-hung door.");
	expect(question?.options).toEqual([
		{ value: "SC Molded", label: "SC Molded" },
		{ value: "HC Flush", label: "HC Flush" },
		{ value: "HC Molded", label: "HC Molded" },
	]);
	expect(question?.canSaveRule).toBe(true);
	expect(preview.clarification?.questions).toHaveLength(1);
	expect(preview.seed.unresolved.find((item) => item.field === "height")?.status)
		.toBe("unsupported");

	const explicit = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: "One SC Molded door.",
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({ ...snapshot, configuration: routeConfiguration,
				configurationJson: JSON.stringify(configuration) }),
			createProvider: () => async () => ({ output: {
				schemaVersion: 1,
				lineItems: [{ uid: "line-2", qty: 1,
					formSteps: [{ stepId: 1, prodUid: "door" }] }],
				unresolved: [{ lineUid: "line-2", stepId: 2, field: "doorType",
					status: "ambiguous", reason: "Confirm the SC Molded door type." }],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {},
				completeRun: async () => {} },
		},
	});
	expect(explicit.clarification).toBeNull();
	expect(explicit.seed.unresolved[0]?.status).toBe("unsupported");
});

test("exterior prehung details missing from the request remain nonblocking review", async () => {
	const { db } = memoryDb();
	const routeConfiguration = {
		...snapshot.configuration,
		routes: [{ itemTypeUid: "door", rootStepId: 1, stepUids: ["jamb-size"], config: { noHandle: false, hasSwing: true } }],
		steps: [
			{ ...snapshot.configuration.steps[0]!, components: [{ uid: "door", title: "Exterior pre-hung" }] },
			{ id: 4, uid: "jamb-size", title: "Jamb Size", selectionMode: "single" as const,
				components: [{ uid: "jamb-4", title: '4-5/8"' }, { uid: "slab", title: "DOOR SLAB ONLY (NO FRAME)" },
					{ uid: "jamb-6", title: '6-9/16"' }] },
		],
	};
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: "Two exterior pre-hung doors, 30 x 80.",
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot, configuration: routeConfiguration,
				configurationJson: JSON.stringify({
					...routeConfiguration,
					steps: routeConfiguration.steps.map((step) => ({
						...step, components: step.components.map((component) => [component.uid, component.title]),
					})),
				}),
			}),
			createProvider: () => async () => ({ output: {
				schemaVersion: 1,
				lineItems: [{ uid: "line-1", qty: 2, formSteps: [{ stepId: 1, prodUid: "door" }] }],
				unresolved: [],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved).toEqual([]);
});

test("missing size or width stays in review once the current route is usable", async () => {
	for (const missingField of ["doorSize", "width"]) {
	const { db } = memoryDb();
	const routeConfiguration = {
		...snapshot.configuration,
		routes: [{ itemTypeUid: "door", rootStepId: 1, stepUids: ["height", "door-size"] }],
		steps: [
			...snapshot.configuration.steps,
			{ id: 2, uid: "height", title: "Height", components: [
				{ uid: "height-68", title: "6-8" }, { uid: "height-80", title: "8-0" },
			] },
			{ id: 3, uid: "door-size", title: "Door Size", components: [], doorSizeVariation: [
				{ rules: [{ stepUid: "height", operator: "is" as const, componentsUid: ["height-68"] }],
					widthList: ["2-4", "2-6", "2-8", "3-0"] },
				{ rules: [{ stepUid: "height", operator: "is" as const, componentsUid: ["height-80"] }],
					widthList: ["4-0"] },
			] },
		],
	};
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: "One door, 6-8 height; customer will confirm width.",
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot, configuration: routeConfiguration,
				configurationJson: JSON.stringify({ ...routeConfiguration,
					steps: routeConfiguration.steps.map((step) => ({ ...step,
						components: step.components.map((component) => [component.uid, component.title]) })) }),
			}),
			createProvider: () => async () => ({ output: {
				schemaVersion: 1,
				lineItems: [{ uid: "line-1", qty: 1, formSteps: [
					{ stepId: 1, prodUid: "door" }, { stepId: 2, prodUid: "height-68" },
				] }],
				unresolved: [{ lineUid: "line-1", stepId: 3, field: missingField, status: "ambiguous",
					reason: "Which size did the customer request?" }],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved.find((item) => item.field === missingField)?.status)
		.toBe("unsupported");
	}
});

test("named-room routine configuration gaps do not create questionnaire or review noise", async () => {
	const { db } = memoryDb();
	const source = 'Powder Room - 32" x 96"\nBedroom Entry - 36" x 96"';
	const routeConfiguration = {
		...snapshot.configuration,
		routes: [{ itemTypeUid: "door", rootStepId: 1, stepUids: ["jamb-size"], config: { noHandle: false, hasSwing: true } }],
		steps: [
			{ ...snapshot.configuration.steps[0]!, components: [{ uid: "door", title: "Exterior pre-hung" }] },
			{ id: 4, uid: "jamb-size", title: "Jamb Size", selectionMode: "single" as const,
				components: [{ uid: "jamb-4", title: '4-5/8"' }] },
		],
	};
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot, configuration: routeConfiguration,
				configurationJson: JSON.stringify({ ...routeConfiguration,
					steps: routeConfiguration.steps.map((step) => ({
						...step, components: step.components.map((component) => [component.uid, component.title]),
					})),
				}),
			}),
			createProvider: () => async () => ({ output: {
				schemaVersion: 2,
				lineItems: ["Powder Room", "Bedroom Entry"].map((room, index) => ({
					uid: `line-${index + 1}`, qty: 1, formSteps: [{ stepId: 1, prodUid: "door" }],
				})),
				interpretations: ["Powder Room", "Bedroom Entry"].map((room, index) => ({
					lineUid: `line-${index + 1}`, stepId: 1, field: "itemType",
					sourceText: source.split("\n")[index], selectedProdUid: "door",
					selectedTitle: "Exterior pre-hung", reason: `${room} requires a pre-hung door`,
				})),
				unresolved: [],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved).toEqual([]);
});

test("four-leaf handing and defaultable exterior details remain nonblocking review", async () => {
	const { db } = memoryDb();
	const exteriorConfiguration = {
		...snapshot.configuration,
		routes: [{ itemTypeUid: "door", rootStepId: 1, stepUids: ["jamb-size"], config: { noHandle: false, hasSwing: true } }],
		steps: [
			{ ...snapshot.configuration.steps[0]!, components: [{ uid: "door", title: "Exterior" }] },
			{ id: 61, uid: "jamb-size", title: "Jamb Size", selectionMode: "single" as const,
				components: [{ uid: "jamb", title: "4-7/8" }] },
		],
	};
	const source = "tamaño: 36 x 1 3/4 x 80, cantidad: 4. Necesito dos unidades de doble puerta precolgadas, ambas con apertura hacia afuera a la derecha, para exterior.";
	const preview = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot, configuration: exteriorConfiguration,
				configurationJson: JSON.stringify({
					...exteriorConfiguration,
					steps: exteriorConfiguration.steps.map((step) => ({
						...step, components: step.components.map((component) => [component.uid, component.title]),
					})),
				}),
			}),
			createProvider: () => async () => ({ output: {
				schemaVersion: 1,
				lineItems: [{ uid: "line-1", qty: 2, formSteps: [{ stepId: 1, prodUid: "door" }] }],
				unresolved: [{ lineUid: "line-1", stepId: null, field: "handing/swing",
					status: "ambiguous", reason: "Two double-door units, four total leaves; confirm leaf-level left/right quantities." }],
			} }),
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	});
	expect(preview.clarification).toBeNull();
	expect(preview.seed.unresolved).toEqual([]);
});

test("an answered item type cannot be requested again when the model still has no catalog match", async () => {
	const { db, rows } = memoryDb();
	const source = "Cabinet request, no matching item in the catalog.";
	let providerCalls = 0;
	const dependencies = {
		authorize: async () => {}, reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		createProvider: () => async () => {
			providerCalls++;
			return { output: {
				schemaVersion: 1, lineItems: [], unresolved: [{
					lineUid: null, stepId: null, field: "itemType", status: "ambiguous" as const,
					reason: "No configured cabinet item type matches this request.",
				}],
			} };
		},
		telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
	};
	const first = await beginSalesRequestClarification({
		db, actorUserId: 7, type: "order", text: source,
		signal: new AbortController().signal, dependencies,
	});
	expect(first.clarification?.questions).toHaveLength(1);
	const next = await answerSalesRequestClarification({
		db, actorUserId: 7,
		sessionId: first.clarification!.sessionId,
		revision: 1,
		answers: [{ questionId: first.clarification!.questions[0]!.id, answer: "No matching configured item type; leave unresolved for manual review.", reuse: false }],
		signal: new AbortController().signal, dependencies,
	});
	expect(next.clarification).toBeNull();
	expect(next.seed.unresolved[0]?.field).toBe("itemType");
	expect(rows.get(first.clarification!.sessionId).sourceText).toBe(source);
	expect(rows.get(first.clarification!.sessionId).status).toBe("complete");
	expect(providerCalls).toBe(2);
});
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
										field: calls === 1 ? "material" : "doorStyle",
										status: "ambiguous",
										reason:
											calls === 1
												? 'Which material does "standard door" mean?'
												: 'Which door style does "standard door" mean?',
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
				answer: "six-panel",
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
	expect(guidance.map((a) => a.answer)).toEqual(["six-panel"]);
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

test("order-specific answers cannot be saved as rules through the API", async () => {
	const { db, rows } = memoryDb();
	const question = {
		id: "swing-question", lineUid: "door-1", field: "doorSwing",
		question: "Confirm the swing.", sourceText: "standard door",
		reason: "Customer must confirm swing.", canSaveRule: false,
	};
	rows.set("session", {
		id: "session", actorUserId: 7, saleType: "order",
		scope: snapshot.scope, configurationRevision: snapshot.revision,
		sourceText: "standard door", revision: 1, status: "awaiting",
		questions: [question], answers: [],
	});
	let providerCalls = 0;
	await expect(answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: "session", revision: 1,
		answers: [{ questionId: question.id, answer: "Out-Swing", reuse: true }],
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => { providerCalls++; throw new Error("Unexpected provider call"); },
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	})).rejects.toThrow("cannot be saved as a rule");
	expect(rows.get("session").status).toBe("awaiting");
	expect(rows.get("session").answers).toEqual([]);
	expect(providerCalls).toBe(0);
	expect(reusableClarification({
		questionId: question.id, answer: "Out-Swing", reuse: true,
		active: true, question,
	}, "standard door")).toBe(false);
});

test("door configuration corrections cannot become rules, including an older eligible question", async () => {
	const { db, rows } = memoryDb();
	const question = {
		id: "configuration-question", lineUid: "door-1", field: "doorConfiguration",
		question: "Select a compatible Door Configuration.", sourceText: "PH - Single",
		reason: "The requested route is unavailable.", canSaveRule: true,
	};
	rows.set("session", {
		id: "session", actorUserId: 7, saleType: "order",
		scope: snapshot.scope, configurationRevision: snapshot.revision,
		sourceText: "One Exterior PH - Single impact door", revision: 1,
		status: "awaiting", questions: [question], answers: [],
	});
	let providerCalls = 0;
	await expect(answerSalesRequestClarification({
		db, actorUserId: 7, sessionId: "session", revision: 1,
		answers: [{ questionId: question.id, answer: "Exterior Door Unit - Single PH", reuse: true }],
		signal: new AbortController().signal,
		dependencies: {
			authorize: async () => {}, reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => { providerCalls++; throw new Error("Unexpected provider call"); },
			telemetry: { beginRun: async () => {}, markProviderAttempted: async () => {}, completeRun: async () => {} },
		},
	})).rejects.toThrow("cannot be saved as a rule");
	expect(rows.get("session").status).toBe("awaiting");
	expect(rows.get("session").answers).toEqual([]);
	expect(providerCalls).toBe(0);
	expect(reusableClarification({
		questionId: question.id, answer: "Exterior Door Unit - Single PH",
		reuse: true, active: true, question,
	}, "One Exterior PH - Single impact door")).toBe(false);
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
		canSaveRule: true,
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

test("interpretation warnings are counted, owner-scoped, and become reusable guidance only after opt out", async () => {
	const { db } = memoryDb();
	const warning = {
		lineUid: "line-1",
		stepId: 1,
		field: "door product",
		sourceText: "smooth solid-core slab",
		selectedProdUid: "door",
		selectedTitle: "Door",
		reason: "The catalog has one compatible solid-core slab.",
	};
	await recordSalesRequestInterpretationWarnings(db, {
		actorUserId: 7,
		saleType: "order",
		scope: snapshot.scope,
		configurationRevision: snapshot.revision,
		sourceText: "Quote one smooth solid-core slab",
		interpretations: [warning],
	});
	await recordSalesRequestInterpretationWarnings(db, {
		actorUserId: 7,
		saleType: "quote",
		scope: snapshot.scope,
		configurationRevision: snapshot.revision,
		sourceText: "Price a smooth solid-core slab",
		interpretations: [{ ...warning, lineUid: "another-line" }],
	});
	const before = await listSalesRequestInterpretationWarnings(db, 7);
	expect(before.summary).toEqual({
		occurrenceCount: 2,
		warningCount: 1,
		doNotShowCount: 0,
	});
	expect(before.categories[0]?.warnings[0]).toMatchObject({
		category: "product",
		occurrenceCount: 2,
		doNotShow: false,
		eligible: true,
	});
	expect(
		(await listSalesRequestInterpretationWarnings(db, 8)).summary.warningCount,
	).toBe(0);

	await setSalesRequestInterpretationWarningGuidance(db, 7, {
		warning,
		active: true,
		scope: snapshot.scope,
		configurationRevision: snapshot.revision,
	});
	const guidance = await readClarificationGuidance(db, {
		actorUserId: 7,
		scope: snapshot.scope,
		configurationRevision: snapshot.revision,
		text: "Another smooth solid-core slab",
		productTitles: ["Door"],
	});
	expect(guidance).toHaveLength(1);
	expect(guidance[0]).toMatchObject({
		answer: "Door",
		suppressWarning: true,
	});
	const active = await listSalesRequestInterpretationWarnings(db, 7);
	expect(active.summary.doNotShowCount).toBe(1);
	await setSalesRequestInterpretationWarningGuidance(db, 7, {
		key: active.categories[0]!.warnings[0]!.key,
		active: false,
	});
	expect(
		(await listSalesRequestInterpretationWarnings(db, 7)).summary
			.doNotShowCount,
	).toBe(0);
	await setSalesRequestInterpretationWarningGuidance(db, 7, {
		key: active.categories[0]!.warnings[0]!.key,
		active: true,
		scope: snapshot.scope,
		configurationRevision: "two",
		isCurrentComponent: (stepId, prodUid, title) =>
			stepId === 1 && prodUid === "door" && title === "Door",
	});
	expect(
		(
			await listSalesRequestInterpretationWarnings(db, 7, {
				scope: snapshot.scope,
				configurationRevision: "two",
			})
		).summary.doNotShowCount,
	).toBe(1);
	expect(
		await readClarificationGuidance(db, {
			actorUserId: 7,
			scope: snapshot.scope,
			configurationRevision: "two",
			text: "smooth solid-core slab",
			productTitles: ["Door"],
		}),
	).toHaveLength(1);
});

test("request-specific numeric warnings are recorded but cannot become guidance", async () => {
	const { db } = memoryDb();
	const warning = {
		lineUid: "line-1",
		stepId: 1,
		field: "quantity",
		sourceText: "eleven doors",
		selectedProdUid: "door",
		selectedTitle: "Door",
		reason: "Mapped the written quantity.",
	};
	await recordSalesRequestInterpretationWarnings(db, {
		actorUserId: 7,
		saleType: "order",
		scope: snapshot.scope,
		configurationRevision: snapshot.revision,
		sourceText: "eleven doors",
		interpretations: [warning],
	});
	expect(
		(await listSalesRequestInterpretationWarnings(db, 7)).categories[0]
			?.warnings[0]?.eligible,
	).toBe(false);
	await expect(
		setSalesRequestInterpretationWarningGuidance(db, 7, {
			warning,
			active: true,
			scope: snapshot.scope,
			configurationRevision: snapshot.revision,
		}),
	).rejects.toThrow("cannot become reusable guidance");
});
