import { describe, expect, test } from "bun:test";
import {
	type SalesRequestGeneratePreviewOutput,
	createSalesRequestGenerationController,
	mapSalesRequestGenerationError,
} from "./request-generation-controller";

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

function preview(configurationRevision = "config-1") {
	return {
		configurationRevision,
		seed: { schemaVersion: 2 },
		promptVersion: "new-sales-form-seed-v6",
		provider: "deepseek",
		model: "deepseek-v4-flash",
		usage: { inputTokens: 12, outputTokens: 8 },
	} as unknown as SalesRequestGeneratePreviewOutput;
}

describe("sales request generation controller", () => {
	test("coalesces a double click into one preview request", async () => {
		const request = deferred<SalesRequestGeneratePreviewOutput>();
		const calls: Array<{ text: string; signal: AbortSignal }> = [];
		const controller = createSalesRequestGenerationController(
			(input) => {
				calls.push(input);
				return request.promise;
			},
			{ formRevision: "form-1", configurationRevision: "config-1" },
		);

		const first = controller.generate("customer request");
		const second = controller.generate("customer request");

		expect(second).toBe(first);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.text).toBe("customer request");
		expect(calls[0]?.signal.aborted).toBe(false);

		request.resolve(preview());
		expect(await first).toEqual(preview());
		expect(controller.getSnapshot().status).toBe("success");
	});

	test("supersedes an older request and ignores its response", async () => {
		const firstRequest = deferred<SalesRequestGeneratePreviewOutput>();
		const secondRequest = deferred<SalesRequestGeneratePreviewOutput>();
		const requests = [firstRequest, secondRequest];
		const calls: Array<{ text: string; signal: AbortSignal }> = [];
		const controller = createSalesRequestGenerationController(
			(input) => {
				calls.push(input);
				const request = requests[calls.length - 1];
				if (!request) throw new Error("Unexpected request");
				return request.promise;
			},
			{ formRevision: "form-1", configurationRevision: "config-1" },
		);

		const first = controller.generate("first request");
		const second = controller.generate("second request");

		expect(calls).toHaveLength(2);
		expect(calls[0]?.signal.aborted).toBe(true);
		expect(controller.getSnapshot().requestId).toBe(2);

		firstRequest.resolve(preview());
		expect(await first).toBeNull();
		expect(controller.getSnapshot().status).toBe("pending");
		expect(controller.getSnapshot().result).toBeNull();

		const result = preview();
		secondRequest.resolve(result);
		expect(await second).toEqual(result);
		expect(controller.getSnapshot().result).toEqual(result);
	});

	test("cancels a pending request without retaining its response", async () => {
		const request = deferred<SalesRequestGeneratePreviewOutput>();
		const controller = createSalesRequestGenerationController(
			(input) => request.promise,
			{ formRevision: "form-1", configurationRevision: "config-1" },
		);

		const pending = controller.generate("cancel me");
		controller.cancel();

		expect(controller.getSnapshot().status).toBe("cancelled");
		request.resolve(preview());
		expect(await pending).toBeNull();
		expect(controller.getSnapshot().result).toBeNull();
	});

	test("retries a failed preview without changing the source text", async () => {
		let attempts = 0;
		const result = preview();
		const controller = createSalesRequestGenerationController(
			() => {
				attempts += 1;
				return attempts === 1
					? Promise.reject(
							new Error(
								"The AI response did not match the new sales form seed format.",
							),
						)
					: Promise.resolve(result);
			},
			{ formRevision: "form-1", configurationRevision: "config-1" },
		);

		expect(await controller.generate("retry this request")).toBeNull();
		expect(controller.getSnapshot().failure?.code).toBe("invalid-output");

		expect(await controller.retry()).toEqual(result);
		expect(attempts).toBe(2);
		expect(controller.getSnapshot().sourceText).toBe("retry this request");
		expect(controller.getSnapshot().status).toBe("success");
	});

	test("disposes safely when the owning component unmounts", async () => {
		const request = deferred<SalesRequestGeneratePreviewOutput>();
		const controller = createSalesRequestGenerationController(
			(input) => request.promise,
			{ formRevision: "form-1", configurationRevision: "config-1" },
		);

		const pending = controller.generate("navigate away");
		controller.dispose();
		expect(controller.getSnapshot().status).toBe("cancelled");

		request.resolve(preview());
		expect(await pending).toBeNull();
		expect(controller.getSnapshot().result).toBeNull();
	});

	test("marks a completed result stale when form or configuration revision changes", async () => {
		const controller = createSalesRequestGenerationController(
			(input) => Promise.resolve(preview()),
			{ formRevision: "form-1", configurationRevision: "config-1" },
		);

		await controller.generate("stale after edit");
		controller.setRevision({
			formRevision: "form-2",
			configurationRevision: "config-1",
		});

		expect(controller.getSnapshot().isStale).toBe(true);
		expect(controller.getSnapshot().result).not.toBeNull();

		controller.setRevision({
			formRevision: "form-2",
			configurationRevision: "config-2",
		});
		expect(controller.getSnapshot().isStale).toBe(true);
	});

	test("marks a result stale when the server returns another configuration revision", async () => {
		const controller = createSalesRequestGenerationController(
			(input) => Promise.resolve(preview("config-server")),
			{ formRevision: "form-1", configurationRevision: "config-client" },
		);

		await controller.generate("mismatched configuration");

		expect(controller.getSnapshot().status).toBe("success");
		expect(controller.getSnapshot().isStale).toBe(true);
	});

	test("adopts the server revision when the client configuration revision is unknown", async () => {
		const controller = createSalesRequestGenerationController(
			(input) => Promise.resolve(preview("config-1")),
			{ formRevision: "form-1", configurationRevision: null },
		);

		await controller.generate("unknown configuration revision");

		expect(controller.getSnapshot().isStale).toBe(false);
		expect(controller.getSnapshot().capturedRevision).toEqual({
			formRevision: "form-1",
			configurationRevision: "config-1",
		});

		controller.setRevision({
			formRevision: "form-2",
			configurationRevision: null,
		});
		expect(controller.getSnapshot().isStale).toBe(true);
	});

	test("maps server failures to stable client error codes", () => {
		const cases = [
			[
				{
					code: "PRECONDITION_FAILED",
					message: "Sales request generation is not enabled.",
				},
				"disabled",
			],
			[{ code: "FORBIDDEN", message: "Not allowed" }, "permission"],
			[
				{
					code: "PROVIDER_UNAVAILABLE",
					message: "Configure the provider API key.",
				},
				"credential",
			],
			[
				{ code: "TOO_MANY_REQUESTS", message: "Too many requests" },
				"usage-limit",
			],
			[
				Object.assign(new Error("The provider timed out"), {
					name: "TimeoutError",
				}),
				"timeout",
			],
			[
				Object.assign(new Error("The request was aborted"), {
					name: "AbortError",
				}),
				"cancelled",
			],
			[
				new Error(
					"The AI response did not match the new sales form seed format.",
				),
				"invalid-output",
			],
			[
				new Error(
					"Sales configuration changed during generation. Generate the preview again.",
				),
				"configuration-changed",
			],
		] as const;

		for (const [error, code] of cases) {
			expect(mapSalesRequestGenerationError(error).code).toBe(code);
		}
	});
});
