import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { QueryClient } from "@gnd/ui/tanstack";

const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");

describe("canonical dispatch packing command regression", () => {
	test("submits shared admin and driver packing through dispatch.confirmPacking", () => {
		expect(source).toContain("trpc.dispatch.confirmPacking.mutationOptions");
		expect(source).toContain("queryClient.fetchQuery(");
		expect(source).toContain("expectedManifestRevision");
		expect(source).toContain("toPackingCommandQuantity(item.qty || {})");
		expect(source).toContain('code === "PRECONDITION_FAILED"');
		expect(source).toContain(": error.message");
		expect(source).toContain("Review inventory availability before retrying");
		expect(source).not.toContain('taskName: "update-sales-control"');
	});

	test("forces the submit-time packing revision read past the global fresh cache", async () => {
		let serverRevision = "revision-before-change";
		let reads = 0;
		const client = new QueryClient({
			defaultOptions: { queries: { staleTime: 60_000 } },
		});
		const options = {
			queryKey: ["dispatch", "packing", 4597] as const,
			queryFn: async () => {
				reads += 1;
				return serverRevision;
			},
		};

		expect(await client.fetchQuery(options)).toBe("revision-before-change");
		serverRevision = "revision-after-change";
		expect(await client.fetchQuery(options)).toBe("revision-before-change");
		expect(reads).toBe(1);

		const submit = source.slice(
			source.indexOf("const submitPackingCommand"),
			source.indexOf("const submitPacking ="),
		);
		expect(submit).toContain("{ staleTime: 0 }");
		expect(await client.fetchQuery({ ...options, staleTime: 0 })).toBe(
			"revision-after-change",
		);
		expect(reads).toBe(2);
	});
});
