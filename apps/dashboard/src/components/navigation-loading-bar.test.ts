import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./navigation-loading-bar.tsx", import.meta.url),
	"utf8",
);

describe("NavigationLoadingBar browser event boundary", () => {
	it("defers native navigation signals until the active Router event stack completes", () => {
		assert.match(source, /queueTimer\(startLoading, 0\)/);
		assert.equal(source.match(/scheduleStartLoading\(\);/g)?.length, 2);
		assert.doesNotMatch(source, /startLoading\(\);/);
	});

	it("does not update React state while the document is unloading", () => {
		assert.doesNotMatch(source, /addEventListener\("beforeunload"/);
		assert.doesNotMatch(source, /removeEventListener\("beforeunload"/);
	});
});
