import { describe, expect, it } from "bun:test";

import { buildDispatchManifestRevision } from "./revision";

describe("dispatch manifest revision", () => {
	it("is stable across object key order and changes with manifest quantities", () => {
		const first = buildDispatchManifestRevision({
			dispatchId: 77,
			items: [{ id: 1, qty: 2 }],
		});
		const reordered = buildDispatchManifestRevision({
			items: [{ qty: 2, id: 1 }],
			dispatchId: 77,
		});
		const changed = buildDispatchManifestRevision({
			dispatchId: 77,
			items: [{ id: 1, qty: 3 }],
		});

		expect(reordered).toBe(first);
		expect(changed).not.toBe(first);
		expect(first).toMatch(/^manifest_[a-f0-9]{16}$/);
	});
});
