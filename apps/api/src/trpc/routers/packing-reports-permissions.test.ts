import { describe, expect, it } from "bun:test";

describe("packing report permissions", () => {
	it("keeps every packing report operation protected and session scoped", async () => {
		const source = await Bun.file(
			new URL("./packing-reports.route.ts", import.meta.url),
		).text();
		expect(source).toContain("context: protectedProcedure");
		expect(source).toContain("submit: protectedProcedure");
		expect(source).toContain("decide: protectedProcedure");
		expect(source).toContain("ctx.userId");
		expect(source).not.toContain("submittedById:");
		expect(source).not.toContain("reviewedById:");
	});
});
