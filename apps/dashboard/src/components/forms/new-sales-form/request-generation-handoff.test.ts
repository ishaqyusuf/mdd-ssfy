import { afterEach, expect, mock, spyOn, test } from "bun:test";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";
import { clearSalesRequestGenerationHandoff, readSalesRequestGenerationHandoff, writeSalesRequestGenerationHandoff } from "./request-generation-handoff";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const preview = {
	generationId: "11111111-1111-4111-8111-111111111111",
	seed: { schemaVersion: 2, lineItems: [], unresolved: [] },
} as SalesRequestGeneratePreviewOutput;

afterEach(() => {
	clearSalesRequestGenerationHandoff(preview.generationId);
	mock.restore();
	if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
	else Reflect.deleteProperty(globalThis, "window");
});

test("unavailable session storage preserves a generated preview for same-tab navigation", () => {
	Object.defineProperty(globalThis, "window", { configurable: true, value: {
		get sessionStorage() { throw new Error("Storage is blocked"); },
	} });
	expect(() => writeSalesRequestGenerationHandoff(preview)).not.toThrow();
	expect(readSalesRequestGenerationHandoff(preview.generationId)).toEqual(preview);
	expect(() => clearSalesRequestGenerationHandoff(preview.generationId)).not.toThrow();
	expect(readSalesRequestGenerationHandoff(preview.generationId)).toBeNull();
});

test("in-memory fallback expires after the same fifteen-minute deadline", () => {
	Object.defineProperty(globalThis, "window", { configurable: true, value: {
		get sessionStorage() { throw new Error("Storage is blocked"); },
	} });
	const now = Date.now();
	const clock = spyOn(Date, "now").mockReturnValue(now);
	writeSalesRequestGenerationHandoff(preview);
	clock.mockReturnValue(now + 15 * 60 * 1000 + 1);
	expect(readSalesRequestGenerationHandoff(preview.generationId)).toBeNull();
});

test("review context preserves the exact pasted source without changing the generated seed", () => {
	Object.defineProperty(globalThis, "window", { configurable: true, value: {
		get sessionStorage() { throw new Error("Storage is blocked"); },
	} });
	const sourceText = "2/8 8/0 RH\n24 tiras de base\n21 tiras de crown\n<script>not executable</script>";
	writeSalesRequestGenerationHandoff({ ...preview, sourceText });
	const restored = readSalesRequestGenerationHandoff(preview.generationId);
	expect(restored?.sourceText).toBe(sourceText);
	expect(restored?.seed).toEqual(preview.seed);
	clearSalesRequestGenerationHandoff(preview.generationId);
	expect(readSalesRequestGenerationHandoff(preview.generationId)).toBeNull();
});
