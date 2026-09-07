import { it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

it("Escape dismisses an open filter menu without clearing filters or pending search", () => {
	const source = readFileSync(new URL("./search-filter-trpc.tsx", import.meta.url), "utf8");
	const body = source.split('"esc",')[1]?.split("(event) => {")[1]?.split("\n\t\t},")[0];
	assert.ok(body);
	for (const [isOpen, inputFocused] of [[true, false], [false, false], [false, true]]) {
		const calls: string[] = [];
		const pending = { current: true };
		const input = {};
		const dismissOnly = isOpen || !inputFocused;
		new Function("isOpen", "setIsOpen", "hasPendingDebouncedSearch", "setPrompt", "clearEditableFilters", "event", "inputRef", body)(
			isOpen, () => calls.push("close"), pending,
			() => calls.push("clear search"), () => calls.push("clear filters"),
			{ target: inputFocused ? input : {} }, { current: input },
		);
		assert.deepEqual(calls, dismissOnly ? ["close"] : ["clear search", "clear filters", "close"]);
		assert.equal(pending.current, dismissOnly);
	}
});
