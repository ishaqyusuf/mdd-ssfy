import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./use-dispatch-packing.ts", import.meta.url),
	"utf8",
);

describe("mobile dispatch packing command", () => {
	test("uses only atomic revision-bound packing and reset mutations", () => {
		expect(source).toContain("_trpc.dispatch.confirmPacking.mutationOptions");
		expect(source).toContain("_trpc.dispatch.resetPacking.mutationOptions");
		expect(source).toContain("expectedManifestRevision");
		expect(source).toContain("expectedPipelineRevision");
		expect(source).toContain(
			"requestIds.current.get(key) || crypto.randomUUID()",
		);
		expect(source).toContain("requestIds.current.set(key, requestId)");
		expect(source).toContain("requestIds.current.delete(key)");
		expect(source).not.toContain("useTaskTrigger");
		expect(source).not.toContain("prepareInventoryForDispatch");
		expect(source).not.toContain("updateDispatchStatus");
	});
});
