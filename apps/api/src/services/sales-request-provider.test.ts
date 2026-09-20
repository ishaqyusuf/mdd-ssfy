import { describe, expect, test } from "bun:test";
import { SALES_REQUEST_AI_PROVIDER_CATALOG } from "@gnd/settings/sales-request-ai-catalog";
import {
	APICallError,
	JSONParseError,
	NoObjectGeneratedError,
	RetryError,
	type generateText,
} from "ai";
import {
	SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER,
	SALES_REQUEST_DEFAULT_MAX_RETRIES,
	SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
	SALES_REQUEST_MAX_OUTPUT_TOKENS,
	SalesRequestProviderConfigurationError,
	SalesRequestProviderExecutionError,
	classifySalesRequestProviderFailure,
	createSalesRequestProvider,
	getSalesRequestProviderApiKey,
	getSalesRequestProviderRuntimeOptions,
	resolveSalesRequestProviderMaxRetries,
	salesRequestMaxOutputTokens,
} from "./sales-request-provider";

const credentials = {
	SALES_REQUEST_OPENAI_API_KEY: "openai-secret",
	SALES_REQUEST_ANTHROPIC_API_KEY: "anthropic-secret",
	SALES_REQUEST_DEEPSEEK_API_KEY: "deepseek-secret",
	SALES_REQUEST_GOOGLE_API_KEY: "google-secret",
};

const validEmptyPreview = {
	schemaVersion: 2,
	lineItems: [],
	unresolved: [{ lineUid: null, stepId: null, field: "request", status: "unsupported", reason: "No order was requested." }],
};

test("allows complete JSON for a dense named-room schedule without raising ordinary request output", () => {
	const row = (index: number) => `Bedroom ${index} - 32\" x 96\"`;
	expect(salesRequestMaxOutputTokens(Array.from({ length: 12 }, (_, index) => row(index + 1)).join("\n")))
		.toBe(12_000);
	expect(salesRequestMaxOutputTokens(Array.from({ length: 11 }, (_, index) => row(index + 1)).join("\n")))
		.toBe(SALES_REQUEST_MAX_OUTPUT_TOKENS);
});

test("allows a two-sided door schedule to complete without raising short requests", () => {
	const doors = Array.from({ length: 11 }, (_, index) => `30” LT = BEDROOM ${index + 1}`);
	const twoSides = ["Left Side", ...doors, "Right Side", "32” RT = MBR BATH"].join("\n");
	expect(salesRequestMaxOutputTokens(twoSides)).toBe(12_000);
	expect(salesRequestMaxOutputTokens(["Left Side", ...doors].join("\n"))).toBe(SALES_REQUEST_MAX_OUTPUT_TOKENS);
	expect(salesRequestMaxOutputTokens(["Left Side", ...doors.slice(0, 10), "Right Side", "32” RT = MBR BATH"].join("\n"))).toBe(SALES_REQUEST_MAX_OUTPUT_TOKENS);
});

describe("sales request provider credentials", () => {
test.each([
		["openai", "SALES_REQUEST_OPENAI_API_KEY", "openai-secret"],
		["anthropic", "SALES_REQUEST_ANTHROPIC_API_KEY", "anthropic-secret"],
		["deepseek", "SALES_REQUEST_DEEPSEEK_API_KEY", "deepseek-secret"],
		["google", "SALES_REQUEST_GOOGLE_API_KEY", "google-secret"],
	] as const)(
		"maps %s to its isolated server credential",
		(provider, environmentKey, expected) => {
			expect(SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER[provider]).toBe(
				environmentKey,
			);
			expect(getSalesRequestProviderApiKey(provider, credentials)).toBe(
				expected,
			);
		},
	);

	test("requires only the selected provider credential", () => {
		expect(
			getSalesRequestProviderApiKey("anthropic", {
				SALES_REQUEST_ANTHROPIC_API_KEY: " anthropic-only ",
			}),
		).toBe("anthropic-only");
	});

	test("rejects a missing credential without exposing environment contents", () => {
		let error: unknown;
		try {
			getSalesRequestProviderApiKey("deepseek", {
				SALES_REQUEST_OPENAI_API_KEY: "must-not-leak",
			});
		} catch (cause) {
			error = cause;
		}

		expect(error).toBeInstanceOf(SalesRequestProviderConfigurationError);
		expect(String(error)).not.toContain("must-not-leak");
	});
});

test("reports zero handed units without exposing the door row", async () => {
	const output = { schemaVersion: 2, lineItems: [{ uid: "private-room", qty: 1,
		formSteps: [], housePackageTool: { doors: [{ dimension: "2-8 x 8-0", lhQty: 0, rhQty: 0 }] } }], unresolved: [] };
	const provider = createSalesRequestProvider({
		selection: { provider: "deepseek", model: "deepseek-flash" },
		environment: credentials, maxRetries: 0, maxOutputRepairs: 0,
		generateTextImpl: (async () => ({
			output, text: JSON.stringify(output), usage: {}, finishReason: "stop",
		})) as typeof generateText,
	});
	let failure: unknown;
	try {
		await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }),
			text: "private request", images: [], signal: new AbortController().signal });
	} catch (error) { failure = error; }
	expect(classifySalesRequestProviderFailure(failure).schemaIssues)
		.toContainEqual({ code: "custom", path: "lineItems.[].housePackageTool.doors.[]", detail: "zero-handed-units" });
	expect(JSON.stringify(failure)).not.toContain("private-room");
});

test("guides a zero-handed door repair toward a room-scoped question", async () => {
	const invalid = { schemaVersion: 2, lineItems: [{ uid: "private-room", qty: 1,
		formSteps: [], housePackageTool: { doors: [{ dimension: "2-8 x 8-0", lhQty: 0, rhQty: 0 }] } }], unresolved: [] };
	let calls = 0;
	let correction = "";
	const provider = createSalesRequestProvider({
		selection: { provider: "deepseek", model: "deepseek-flash" },
		environment: credentials, maxRetries: 0, maxOutputRepairs: 1,
		generateTextImpl: (async (options) => {
			calls++;
			if (calls === 2) correction = String(options.messages?.at(-1)?.content ?? "");
			const output = calls === 1 ? invalid : validEmptyPreview;
			return { output, text: JSON.stringify(output), usage: {}, finishReason: "stop" };
		}) as typeof generateText,
	});
	await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }),
		text: "Private room request", images: [], signal: new AbortController().signal });
	expect(calls).toBe(2);
	expect(correction).toContain("line-scoped ambiguous handing question");
	expect(correction).toContain("Never invent a split");
	expect(correction).not.toContain("private-room");
	expect(correction).not.toContain("2-8 x 8-0");
});

describe("sales request provider factory", () => {
	test("accepts the trusted Assistant credential without a Sales Request key", async () => {
		const provider = createSalesRequestProvider({
			selection: { provider: "openai", model: "gpt-5-mini" },
			environment: {},
			apiKey: "assistant-only-key",
			generateTextImpl: (async () => ({
				output: validEmptyPreview,
				text: JSON.stringify(validEmptyPreview),
				usage: { inputTokens: 3, outputTokens: 4 },
				finishReason: "stop",
			})) as typeof generateText,
		});
		const result = await provider({
			configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }),
			text: "request", images: [], signal: new AbortController().signal,
		});
		expect(result).toMatchObject({ provider: "openai", model: "gpt-5-mini", inputTokens: 3, outputTokens: 4 });
	});
	test("native catalog correction shares the two-response limit and retains private validation errors locally", async () => {
		let calls = 0;
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" }, environment: credentials, maxRetries: 0, maxOutputRepairs: 1,
			validateSeed: () => { throw new Error("Selected height cannot resolve the requested size"); },
			generateTextImpl: (async () => {
				calls++;
				return { output: validEmptyPreview, text: JSON.stringify(validEmptyPreview), usage: { inputTokens: 10, outputTokens: 20 }, finishReason: "stop" };
			}) as typeof generateText,
		});
		let failure: unknown;
		try { await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }), text: "request", images: [], signal: new AbortController().signal }); } catch (error) { failure = error; }
		expect(calls).toBe(2);
		expect(classifySalesRequestProviderFailure(failure)).toMatchObject({ stage: "structured-output", configurationIssue: "dimensions", schemaIssues: [{ code: "configuration-validation", path: "seed" }], inputTokens: 20, outputTokens: 40 });
		expect(String(failure)).not.toContain("Selected height");
	});
	test.each([
		[{ uid: "door", qty: 0, formSteps: [] }, "zero-quantity"],
		[{ uid: "door", qty: 2, formSteps: [],
			housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 1 }] } },
			"hpt-quantity-mismatch"],
	] as const)("reports only a safe line-quantity reason for %s", async (line, detail) => {
		const output = { schemaVersion: 2, lineItems: [line], unresolved: [] };
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials, maxRetries: 0, maxOutputRepairs: 0,
			generateTextImpl: (async () => ({
				output, text: JSON.stringify(output), usage: {}, finishReason: "stop",
			})) as typeof generateText,
		});
		let failure: unknown;
		try {
			await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }),
				text: "private order details", images: [], signal: new AbortController().signal });
		} catch (error) { failure = error; }
		expect(classifySalesRequestProviderFailure(failure).schemaIssues)
			.toContainEqual({ code: "custom", path: "lineItems.[].qty", detail });
		expect(JSON.stringify(failure)).not.toContain("private order details");
	});
	test.each([
		["missing-line", "interpretations.[].lineUid"],
		["wrong-component", "interpretations.[].selectedProdUid"],
	] as const)("reports only the safe interpretation path for %s", async (kind, path) => {
		const output = {
			schemaVersion: 2,
			lineItems: [{ uid: "line-1", qty: 1, formSteps: [{ stepId: 1, prodUid: "actual" }] }],
			unresolved: [],
			interpretations: [{
				lineUid: kind === "missing-line" ? "removed" : "line-1",
				stepId: 1, field: "product", sourceText: "requested item",
				selectedProdUid: kind === "wrong-component" ? "other" : "actual",
				selectedTitle: "Catalog title", reason: "Interpreted shorthand",
			}],
		};
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials, maxRetries: 0, maxOutputRepairs: 0,
			generateTextImpl: (async () => ({
				output, text: JSON.stringify(output), usage: {}, finishReason: "stop",
			})) as typeof generateText,
		});
		let failure: unknown;
		try {
			await provider({
				configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }),
				text: "private request", images: [], signal: new AbortController().signal,
			});
		} catch (error) { failure = error; }
		expect(classifySalesRequestProviderFailure(failure).schemaIssues)
			.toEqual([{ code: "custom", path }]);
		expect(JSON.stringify(failure)).not.toContain("private request");
	});
	test.each([
		["Delivery option pickup must be stated in the customer request.", "delivery-option-source", "Omit form entirely"],
		["Moulding component Unknown Profile must be stated in the customer request.", "moulding-product", "Do not substitute a different profile"],
		["Door dimension 2-6 x 6-8 must be stated in the customer request.", "door-dimension-source", "ask only for the missing or ambiguous measurement"],
		["The Laundry Entry line uses a different size than the customer request.", "door-dimension-source", "Do not borrow another room's size"],
		["Line test uses a door dimension outside its selected Height configuration.", "dimensions", "record its exact requested dimension"],
		["Line room-1 selects an interior route for an exterior-only customer request.", "route", "remove the Interior route"],
		["Line room-1 must select exactly one configured item route.", "route", "one compatible configured route"],
		["Line room-1 selects a slabs-only route for a pre-hung customer request.", "route", "Remove the slabs-only line"],
		["The door schedule has 22 explicit entries, but only 1 selected units and 0 dimension-specific unresolved entries.", "source-coverage", "Count each separate door schedule row"],
		["The door schedule selects 5 units at 2-8 x 8-0, but only 4 separate source rows explicitly state that size.", "source-coverage", "A bare width followed by a slash height"],
		["The room door schedule has 22 sized entries, but only 0 configured door sizes and 0 dimension-specific unresolved entries.", "source-coverage", "housePackageTool doors"],
		["The Cabana Bathroom width 30' must remain an ambiguous question until its unit is confirmed.", "source-coverage", "single apostrophe means feet"],
		["Line line-1 interpretation references a step outside its configured route.", "interpretation-route", "configured route"],
		["Line line-1 interpretation must use the current configured component title.", "interpretation-title", "current configured component title"],
	] as const)("native source grounding safely repairs %s", async (message, category, repairHint) => {
		let repairInstruction = "";
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" }, environment: credentials,
			maxRetries: 0, maxOutputRepairs: 1,
			validateSeed: () => { throw new Error(message); },
			generateTextImpl: (async (options: { messages?: Array<{ role: string; content: unknown }> }) => {
				repairInstruction = String(options.messages?.at(-1)?.content ?? "");
				return { output: validEmptyPreview,
					text: JSON.stringify(validEmptyPreview), usage: {}, finishReason: "stop" };
			}) as typeof generateText,
		});
		let failure: unknown;
		try {
			await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }),
				text: "private sample", images: [], signal: new AbortController().signal });
		} catch (error) { failure = error; }
		expect(classifySalesRequestProviderFailure(failure)).toMatchObject({
			configurationIssue: category, repairAttempted: true,
		});
		expect(JSON.stringify(failure)).not.toContain(message);
		expect(repairInstruction).toContain(repairHint);
		if (category === "route") {
			expect(repairInstruction).not.toContain("two exterior double");
			expect(repairInstruction).not.toContain("four leaves");
			expect(classifySalesRequestProviderFailure(failure).routeFailureKind).toBe(
				message.includes("slabs-only") ? "slab-for-prehung" :
				message.includes("exterior-only") ? "interior-for-exterior" : "missing-root",
			);
		}
	});
	test("recovers once when DeepSeek returns text but no structured object", async () => {
		let calls = 0;
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials, maxRetries: 0, maxOutputRepairs: 1,
			generateTextImpl: (async () => {
				calls++;
				if (calls === 1) throw new NoObjectGeneratedError({
					message: "Malformed object", text: '{"schemaVersion":2}',
					response: {}, usage: { inputTokens: 10, outputTokens: 5 }, finishReason: "stop",
				} as never);
				return { output: validEmptyPreview, text: JSON.stringify(validEmptyPreview),
					usage: { inputTokens: 12, outputTokens: 6 }, finishReason: "stop" };
			}) as typeof generateText,
		});
		const result = await provider({
			configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }),
			text: "Synthetic door request", images: [], signal: new AbortController().signal,
		});
		expect(calls).toBe(2);
		expect(result.output).toEqual(validEmptyPreview);
		expect(result.inputTokens).toBe(22);
		expect(result.outputTokens).toBe(11);
	});
	test.each(["quantity", "selected-unresolved"] as const)("corrects shared semantic validation failure: %s", async (failure) => {
		const valid = {
			schemaVersion: 2,
			lineItems: [{ uid: "line-1", qty: 1, formSteps: [{ stepId: 1, prodUid: "slab" }], housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 1 }] } }],
			unresolved: [] as Array<{ lineUid: string; stepId: number; field: string; status: string; reason: string }>,
		};
		const invalid = structuredClone(valid);
		if (failure === "quantity") invalid.lineItems[0]!.qty = 2;
		else invalid.unresolved.push({ lineUid: "line-1", stepId: 1, field: "itemType", status: "ambiguous", reason: "Unresolved route" });
		let calls = 0;
		let correction = "";
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" }, environment: credentials, maxRetries: 0, maxOutputRepairs: 1,
			generateTextImpl: (async (options) => {
				calls++;
				if (calls === 2) correction = JSON.stringify(options.messages);
				const output = calls === 1 ? invalid : valid;
				return { output, text: JSON.stringify(output), usage: { inputTokens: 10, outputTokens: 20 }, finishReason: "stop" };
			}) as typeof generateText,
		});
		const result = await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }), text: "One slab 2/8 8/0", images: [], signal: new AbortController().signal });
		expect(calls).toBe(2);
		expect(result.output).toEqual(valid);
		expect(result.outputTokens).toBe(40);
		expect(correction).toContain(failure === "quantity" ? "Line quantity must equal" : "cannot be selected and unresolved");
		if (failure === "quantity") {
			expect(correction).toContain('\\"lineQty\\":2');
			expect(correction).toContain('\\"doorRowTotal\\":1');
			expect(correction).toContain("compare the door-row total with the customer's request");
		}
	});
	test("the first DeepSeek call receives the strict output contract", async () => {
		let system = "";
		let calls = 0;
		const output = validEmptyPreview;
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials,
			maxRetries: 0,
			generateTextImpl: (async (options) => {
				calls++;
				system = String(options.system);
				return { output, text: JSON.stringify(output), usage: {}, finishReason: "stop" };
			}) as typeof generateText,
		});
		await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }), text: "Hello", images: [], signal: new AbortController().signal });
		const contract = JSON.parse(system.split("\nOUTPUT CONTRACT\n")[1]!);
		expect(contract.properties.schemaVersion.const).toBe(2);
		expect(contract.properties.lineItems.items.properties.formSteps).toBeDefined();
		expect(contract.additionalProperties).toBe(false);
		expect(calls).toBe(1);
	});
	test("captures a billed truncated response when the SDK output getter throws", async () => {
		const captures: unknown[] = [];
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" }, environment: credentials, maxRetries: 0,
			generateTextImpl: (async () => ({ get output() { throw new Error("private SDK payload"); }, text: '{"schemaVersion":2,', usage: { inputTokens: 100, outputTokens: 4000 }, finishReason: "length" })) as typeof generateText,
			onEvaluationCapture: async (capture) => { captures.push(capture); },
		});
		let failure: unknown;
		try { await provider({ configurationJson: JSON.stringify({ routes: [], steps: [], visibilityByComponentUid: {} }), text: "sample", images: [], signal: new AbortController().signal }); } catch (error) { failure = error; }
		expect(classifySalesRequestProviderFailure(failure)).toMatchObject({ stage: "structured-output", finishReason: "length", outputTokens: 4000 });
		expect(captures).toHaveLength(1);
		expect(String(failure)).not.toContain("private SDK payload");
	});
	test("manual schema correction is limited to one attempt and sums billed usage", async () => {
		let calls = 0;
		let messages: unknown;
		const valid = validEmptyPreview;
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials,
			maxRetries: 0,
			maxOutputRepairs: 1,
			generateTextImpl: (async (options: { messages: unknown }) => {
				calls++;
				messages = options.messages;
				const output =
					calls === 1 ? { schemaVersion: 2, lineItems: [] } : valid;
				return {
					output,
					text: JSON.stringify(output),
					usage: { inputTokens: 10, outputTokens: 5 },
					finishReason: "stop",
				};
			}) as typeof generateText,
		});
		const result = await provider({
			configurationJson: JSON.stringify({
				routes: [],
				steps: [],
				visibilityByComponentUid: {},
			}),
			text: "Hello",
			images: [],
			signal: new AbortController().signal,
		});
		expect(calls).toBe(2);
		expect(result).toMatchObject({
			output: valid,
			inputTokens: 20,
			outputTokens: 10,
		});
		expect(JSON.stringify(messages)).toContain(
			"Correct the previous JSON once",
		);
	});

	test("a second malformed response remains rejected without a third call", async () => {
		let calls = 0;
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials,
			maxRetries: 0,
			maxOutputRepairs: 1,
			generateTextImpl: (async () => {
				calls++;
				return {
					output: { schemaVersion: 2, lineItems: [] },
					text: '{"schemaVersion":2,"lineItems":[]}',
					usage: { inputTokens: 10, outputTokens: 5 },
					finishReason: "stop",
				};
			}) as typeof generateText,
		});
		let failure: unknown;
		try {
			await provider({
				configurationJson: JSON.stringify({
					routes: [],
					steps: [],
					visibilityByComponentUid: {},
				}),
				text: "Hello",
				images: [],
				signal: new AbortController().signal,
			});
		} catch (error) {
			failure = error;
		}
		expect(failure).toBeInstanceOf(SalesRequestProviderExecutionError);
		expect(classifySalesRequestProviderFailure(failure)).toMatchObject({ repairAttempted: true, finishReason: "stop" });
		expect(calls).toBe(2);
	});
	test("uses bounded non-thinking extraction for DeepSeek only", () => {
		expect(SALES_REQUEST_DEFAULT_MAX_RETRIES).toBe(1);
		expect(SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES).toBe(0);
		expect(resolveSalesRequestProviderMaxRetries()).toBe(1);
		expect(resolveSalesRequestProviderMaxRetries(0)).toBe(0);
		expect(SALES_REQUEST_MAX_OUTPUT_TOKENS).toBe(8_000);
		expect(getSalesRequestProviderRuntimeOptions("deepseek")).toEqual({
			deepseek: { thinking: { type: "disabled" } },
		});
		expect(getSalesRequestProviderRuntimeOptions("google")).toEqual({
			google: { structuredOutputs: false },
		});
		expect(getSalesRequestProviderRuntimeOptions("openai")).toEqual({
			openai: { strictJsonSchema: false },
		});
	});

	test("forwards the live-evaluation zero-retry policy to the AI SDK call", async () => {
		let receivedMaxRetries: number | undefined;
		const captures: unknown[] = [];
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials,
			maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
			generateTextImpl: (async (options: { maxRetries?: number }) => {
				receivedMaxRetries = options.maxRetries;
				return {
					output: validEmptyPreview,
					text: '{"schemaVersion":2,"lineItems":[],"unresolved":[]}',
					usage: { inputTokens: 1, outputTokens: 1 },
					finishReason: "stop",
				};
			}) as typeof generateText,
			onEvaluationCapture: async (capture) => {
				captures.push(capture);
			},
		});

		const result = await provider({
			configurationJson: JSON.stringify({
				schemaVersion: 1,
				routes: [],
				steps: [],
				visibilityByComponentUid: {},
			}),
			text: "unsupported request",
			images: [],
			signal: new AbortController().signal,
		});

		expect(receivedMaxRetries).toBe(0);
		expect(captures).toEqual([
			{
				status: "returned",
				text: '{"schemaVersion":2,"lineItems":[],"unresolved":[]}',
				inputTokens: 1,
				outputTokens: 1,
				finishReason: "stop",
			},
		]);
		expect(result).toEqual({
			output: validEmptyPreview,
			inputTokens: 1,
			outputTokens: 1,
			provider: "deepseek",
			model: "deepseek-flash",
		});
	});

	test("keeps DeepSeek's response format generic and still validates locally", async () => {
		let responseFormat = "";
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			environment: credentials,
			maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
			generateTextImpl: (async (options: {
				model: Parameters<
					NonNullable<
						Parameters<typeof generateText>[0]["output"]
					>["injectIntoSystemPrompt"]
				>[0]["model"];
				output: NonNullable<Parameters<typeof generateText>[0]["output"]>;
				system?: string;
			}) => {
				responseFormat = JSON.stringify(await options.output.responseFormat);
				return {
					output: { schemaVersion: 2, lineItems: [] },
					text: '{"schemaVersion":2,"lineItems":[]}',
					usage: { inputTokens: 1, outputTokens: 1 },
					finishReason: "stop",
				};
			}) as typeof generateText,
		});

		let error: unknown;
		try {
			await provider({
				configurationJson: JSON.stringify({
					schemaVersion: 1,
					routes: [],
					steps: [],
					visibilityByComponentUid: {},
				}),
				text: "one door",
				images: [],
				signal: new AbortController().signal,
			});
		} catch (cause) {
			error = cause;
		}

		expect(responseFormat).not.toContain("housePackageTool");
		expect(error).toBeInstanceOf(SalesRequestProviderExecutionError);
		expect(classifySalesRequestProviderFailure(error)).toMatchObject({
			stage: "structured-output",
			structuredOutputCause: "schema-validation",
			schemaIssues: [
				{
					code: "custom",
					path: "$",
				},
			],
		});
	});

	test("classifies API failures without retaining request or response bodies", () => {
		const error = new APICallError({
			message: "secret upstream message",
			url: "https://api.deepseek.com/chat/completions",
			requestBodyValues: { customerText: "private request" },
			statusCode: 429,
			responseBody: "private upstream body",
			data: {
				error: {
					code: 429,
					status: "RESOURCE_EXHAUSTED",
					message: "private provider detail",
				},
			},
			isRetryable: true,
		});
		const diagnostic = classifySalesRequestProviderFailure(error);

		expect(diagnostic).toEqual({
			stage: "provider-api",
			statusCode: 429,
			providerCode: 429,
			providerStatus: "RESOURCE_EXHAUSTED",
			retryable: true,
		});
		expect(JSON.stringify(diagnostic)).not.toContain("private");
	});

	test("drops malformed or message-like provider error identity", () => {
		const error = new APICallError({
			message: "secret upstream message",
			url: "https://generativelanguage.googleapis.com/v1beta/models/test",
			requestBodyValues: { customerText: "private request" },
			statusCode: 400,
			data: {
				error: {
					code: "400",
					status: "INVALID_ARGUMENT: private detail",
					message: "private provider detail",
				},
			},
			isRetryable: false,
		});

		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "provider-api",
			statusCode: 400,
			retryable: false,
		});
	});

	test("drops a provider code that does not match the HTTP status", () => {
		const error = new APICallError({
			message: "secret upstream message",
			url: "https://generativelanguage.googleapis.com/v1beta/models/test",
			requestBodyValues: { customerText: "private request" },
			statusCode: 400,
			data: {
				error: {
					code: 401,
					status: "INVALID_ARGUMENT",
					message: "private provider detail",
				},
			},
			isRetryable: false,
		});

		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "provider-api",
			statusCode: 400,
			providerStatus: "INVALID_ARGUMENT",
			retryable: false,
		});
	});

	test("classifies only the last provider failure from an exhausted retry", () => {
		const providerError = new APICallError({
			message: "secret upstream message",
			url: "https://generativelanguage.googleapis.com/v1beta/models/test",
			requestBodyValues: { customerText: "private request" },
			statusCode: 503,
			data: {
				error: {
					code: 503,
					status: "UNAVAILABLE",
					message: "private provider detail",
				},
			},
			isRetryable: true,
		});
		const error = new RetryError({
			message: "private retry summary",
			reason: "maxRetriesExceeded",
			errors: [new Error("private first failure"), providerError],
		});

		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "provider-api",
			statusCode: 503,
			providerCode: 503,
			providerStatus: "UNAVAILABLE",
			retryable: true,
		});
	});

	test("provider execution errors expose only the safe diagnostic", () => {
		const error = new SalesRequestProviderExecutionError({
			stage: "structured-output",
			finishReason: "stop",
			inputTokens: 321,
			outputTokens: 45,
		});
		expect(error.message).toBe("The AI provider operation failed.");
		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "structured-output",
			finishReason: "stop",
			inputTokens: 321,
			outputTokens: 45,
		});
	});

	test("preserves safe token usage when structured output fails inside the adapter", async () => {
		const captures: unknown[] = [];
		const provider = createSalesRequestProvider({
			selection: { provider: "openai", model: "gpt-5-mini" },
			environment: credentials,
			maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
			generateTextImpl: (async () => {
				throw new NoObjectGeneratedError({
					message: "private structured-output failure",
					text: "private provider output",
					response: {},
					usage: { inputTokens: 321, outputTokens: 45 },
					finishReason: "stop",
				} as never);
			}) as typeof generateText,
			onEvaluationCapture: async (capture) => {
				captures.push(capture);
			},
		});

		let error: unknown;
		try {
			await provider({
				configurationJson: "{}",
				text: "one door",
				images: [],
				signal: new AbortController().signal,
			});
		} catch (cause) {
			error = cause;
		}

		expect(error).toBeInstanceOf(SalesRequestProviderExecutionError);
		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "structured-output",
			repairAttempted: false,
			finishReason: "stop",
			inputTokens: 321,
			outputTokens: 45,
		});
		expect(captures).toEqual([
			{
				status: "invalid-structured-output",
				text: "private provider output",
				inputTokens: 321,
				outputTokens: 45,
				finishReason: "stop",
			},
		]);
		expect(JSON.stringify(error)).not.toMatch(/private/i);
	});

	test("classifies malformed provider JSON without retaining its text", () => {
		const error = new NoObjectGeneratedError({
			message: "private structured-output failure",
			cause: new JSONParseError({
				text: "private malformed provider output",
				cause: new SyntaxError("private parse detail"),
			}),
			text: "private malformed provider output",
			response: {},
			usage: { inputTokens: 10, outputTokens: 4 },
			finishReason: "stop",
		} as never);

		const diagnostic = classifySalesRequestProviderFailure(error);
		expect(diagnostic).toEqual({
			stage: "structured-output",
			structuredOutputCause: "json-parse",
			outputShape: "invalid-json",
			finishReason: "stop",
			inputTokens: 10,
			outputTokens: 4,
		});
		expect(JSON.stringify(diagnostic)).not.toMatch(/private|malformed/i);
	});

	test.each(
		SALES_REQUEST_AI_PROVIDER_CATALOG.map(
			({ id, defaultModel }) => [id, defaultModel] as const,
		),
	)("creates the allowlisted %s adapter", (provider, model) => {
		expect(
			createSalesRequestProvider({
				selection: { provider, model },
				environment: credentials,
			}),
		).toBeFunction();
	});

	test("rejects a model outside the provider allowlist", () => {
		expect(() =>
			createSalesRequestProvider({
				selection: { provider: "openai", model: "arbitrary-model" },
				environment: credentials,
			}),
		).toThrow("not allowed");
	});

	test("blocks image input for a text-only configured model before any API call", async () => {
		const textOnlyProvider = SALES_REQUEST_AI_PROVIDER_CATALOG.find((entry) =>
			entry.models.some((model) => !model.supportsImages),
		);
		const textOnlyModel = textOnlyProvider?.models.find(
			(model) => !model.supportsImages,
		);
		if (!textOnlyProvider || !textOnlyModel) {
			throw new Error(
				"The provider catalog must retain a text-only test model",
			);
		}
		const provider = createSalesRequestProvider({
			selection: {
				provider: textOnlyProvider.id,
				model: textOnlyModel.id,
			},
			environment: credentials,
		});

		await expect(
			provider({
				configurationJson: "{}",
				text: "one door",
				images: [
					{
						bytes: new Uint8Array([1, 2, 3]),
						mediaType: "image/jpeg",
					},
				],
				signal: new AbortController().signal,
			}),
		).rejects.toThrow("does not support image requests");
	});
});
