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

describe("mobile dispatch proof completion", () => {
	test("submits proof through one dispatch-bound mutation", () => {
		expect(actionsSource).toContain(
			"_trpc.dispatch.completeDispatchWithProof.mutationOptions",
		);
		expect(actionsSource).not.toContain("submitDispatchTask");
		expect(screenSource).not.toContain("documents.uploadBase64");
		expect(screenSource).not.toContain("documents.uploadText");
	});

	test("keeps a stable request id and proof in the open form for retry", () => {
		expect(formSource).toContain(
			"const [requestId] = useState(createCompletionRequestId)",
		);
		expect(formSource).toContain("requestId,");
		expect(screenSource).toContain(
			"Completion paused. Your proof is still here—tap Complete Dispatch to retry.",
		);
	});
});
