import { expect, test } from "bun:test";
import { SalesRequestProviderExecutionError } from "./sales-request-provider";
import {
	beginSalesRequestClarification,
	answerSalesRequestClarification,
	ownedClarification,
	clarificationSourceReference,
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

test("duplex attic-access questions retain side identity and ask for missing heights", async () => {
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
	expect(questions.filter((question) => question.field === "jambSize").map((question) => question.question)).toEqual([
		"Confirm the jamb size for Left Side attic access.",
		"Confirm the jamb size for Right Side attic access.",
	]);
	expect(questions.filter((question) => question.field === "handing").map((question) => question.question)).toEqual([
		"Confirm left-hand or right-hand for Left Side attic access.",
		"Confirm left-hand or right-hand for Right Side attic access.",
	]);
	expect(questions.find((question) => question.field === "door schedule")?.question)
		.toContain("What height applies to the listed doors");
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

test("a named room line asks its missing size without offering an unrelated Door", async () => {
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
	expect(preview.clarification?.questions[0]).toMatchObject({
		question: "What size is the Master Water Closet door?",
		reason: "What size is the Master Water Closet door?",
	});
	expect(preview.clarification?.questions[0]?.options).toBeUndefined();
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

test("impact sidelite fallback asks for the panel height and catalog gaps without repeating known PVC facts", async () => {
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
	expect(preview.clarification?.questions.map((question) => question.field)).toEqual([
		"height", "pvcJamb", "sideliteAssembly", "pvcBrickMoulding",
	]);
	expect(preview.clarification?.questions[0]?.question).toContain("door panel height");
	expect(preview.clarification?.questions[1]?.question).toContain("do not substitute wood or composite");
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

test("an incomplete model dimension quote does not become a customer-facing fact", async () => {
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
	expect(preview.clarification?.questions[0]?.question).toBe("Confirm the dimensions for this request.");
	expect(preview.clarification?.questions[0]?.sourceText).toBeNull();
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
	expect(preview.clarification?.questions[1]?.question).toBe(
		"Confirm the Door product/style for the 30 x 80 left-hand primed white interior pre-hung door.",
	);
});

test("exterior prehung details missing from the request become scoped questions", async () => {
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
	expect(preview.seed.unresolved.map((issue) => issue.field)).toEqual(["jambSize", "handing", "swing"]);
	expect(preview.clarification?.questions.map((question) => question.question)).toEqual([
		"Confirm the jamb size for the 2 Exterior pre-hung doors (30 x 80).",
		"How many of the 2 Exterior pre-hung doors (30 x 80) are left-hand and how many are right-hand?",
		"Confirm in-swing or out-swing for the 2 Exterior pre-hung doors (30 x 80).",
	]);
	expect(preview.clarification?.questions[0]?.options?.map((option) => option.label))
		.toEqual(['4-5/8"', '6-9/16"']);
	expect(preview.clarification?.questions[1]?.options).toHaveLength(2);
	expect(preview.clarification?.questions[2]?.options?.map((option) => option.label))
		.toEqual(["In-Swing", "Out-Swing"]);
	expect(preview.clarification?.questions.every((question) => question.canSaveRule === false))
		.toBe(true);
});

test("missing size or width offers only the current Height and route's conditional sizes", async () => {
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
	const question = preview.clarification?.questions.find((item) => item.field === missingField);
	expect(question?.options?.map((item) => item.value)).toEqual([
		"2-4 x 6-8", "2-6 x 6-8", "2-8 x 6-8", "3-0 x 6-8",
	]);
	expect(question?.canSaveRule).toBe(false);
	}
});

test("named-room questions identify their source room instead of repeating a generic door label", async () => {
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
	expect(preview.clarification?.questions.map((question) => question.question)).toContain(
		"Confirm the jamb size for Powder Room.",
	);
	expect(preview.clarification?.questions.map((question) => question.question)).toContain(
		"Confirm the jamb size for Bedroom Entry.",
	);
});

test("four leaves in two outward-opening double units ask once for leaf split, not stated swing", async () => {
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
	expect(preview.clarification?.questions.map((question) => question.question)).toEqual([
		"Confirm the left/right leaf counts for the two double-door units (four leaves total).",
		"Confirm the jamb size for the 2 Exterior doors (36 x 80).",
	]);
	expect(preview.seed.unresolved.map((item) => item.field)).toEqual([
		"handing/swing", "jambSize", "handing", "swing",
	]);
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
