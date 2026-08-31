import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./use-loading-toast.ts", import.meta.url),
	"utf8",
);

describe("useLoadingToast", () => {
	test("dismisses the active toast before forgetting its id", () => {
		const clearStart = source.indexOf("clearToastId()");
		const clearEnd = source.indexOf("},", clearStart);
		const clearSource = source.slice(clearStart, clearEnd);

		expect(clearSource).toContain("dismiss(toastId)");
		expect(clearSource.indexOf("dismiss(toastId)")).toBeLessThan(
			clearSource.indexOf("setToastId(null)"),
		);
	});
});
