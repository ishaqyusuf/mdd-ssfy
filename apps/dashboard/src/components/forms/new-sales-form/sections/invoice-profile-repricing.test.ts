import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("new sales form profile repricing transition", () => {
		it("defers repricing when profile options have not resolved", () => {
				const source = readFileSync(
						new URL("./invoice-overview-panel.tsx", import.meta.url),
						"utf8",
				);

				expect(source).toContain(
						"if (normalizedNextProfileId != null && nextCoefficient === undefined)",
				);
				expect(source).toContain("setMeta(patch);");
				expect(source).toContain(
						"pendingProfileRepriceRef.current = previousCoefficient != null;",
				);
		});

		it("does not treat a still-loading profile as a zero-coefficient profile", () => {
				const source = readFileSync(
						new URL("./invoice-overview-panel.tsx", import.meta.url),
						"utf8",
				);

				expect(source).toContain(
						"if (customerProfileId != null && !currentProfile) return;",
				);
		});
});
