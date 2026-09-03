import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const actionsSource = readFileSync(
	new URL("./use-dispatch-actions.ts", import.meta.url),
	"utf8",
);
const screenSource = readFileSync(
	new URL("../components/dispatch-detail-screen/index.tsx", import.meta.url),
	"utf8",
);
const formSource = readFileSync(
	new URL("../components/dispatch-complete-form.tsx", import.meta.url),
	"utf8",
);
const draftSource = readFileSync(
	new URL("../lib/dispatch-proof-draft-storage.ts", import.meta.url),
	"utf8",
);

describe("mobile dispatch proof completion", () => {
	test("submits proof through one dispatch-bound mutation", () => {
		expect(actionsSource).toContain(
			"_trpc.dispatch.completeDispatchWithProof.mutationOptions",
		);
		expect(actionsSource).not.toContain("submitDispatchTask");
		expect(screenSource).not.toContain("documents.uploadBase64");
		expect(screenSource).not.toContain("documents.uploadText");
	});

	test("binds weak-network retries to one request and pipeline revision", () => {
		expect(actionsSource).toContain(
			"startRequestIds.current.get(input.dispatchId)",
		);
		expect(actionsSource).toContain(
			"startRequestIds.current.set(input.dispatchId, requestId)",
		);
		expect(actionsSource).toContain("expectedPipelineRevision");
		expect(screenSource).toContain(
			"expectedPipelineRevision: data?.pipelineRevision",
		);
	});

	test("keeps a stable manifest-bound request and app-owned proof for restart retry", () => {
		expect(formSource).toContain("useDispatchProofDraft");
		expect(formSource).toContain("expectedManifestRevision");
		expect(draftSource).toContain("dispatch-proof-draft-v2:");
		expect(draftSource).toContain("FileSystem.documentDirectory");
		expect(draftSource).not.toContain("base64:");
		expect(screenSource).toContain(
			"Completion paused. Your proof is still here—tap Complete Dispatch to retry.",
		);
	});
});
