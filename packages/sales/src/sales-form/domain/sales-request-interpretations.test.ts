import { describe, expect, it } from "bun:test";
import {
	getActiveSalesRequestInterpretations,
	reconcileSalesRequestInterpretations,
	removeSalesRequestInterpretationFromMeta,
} from "./sales-request-interpretations";

const interpretation = {
	lineUid: "line-1",
	stepId: 20,
	field: "door",
	sourceText: "smooth solid-core door slab",
	selectedProdUid: "door-a",
	selectedTitle: "S.C HARDBOARD FLUSH PRIMED 1-3/8",
	reason:
		"The catalog component is the closest compatible flush solid-core slab.",
};

function line(prodUid = "door-a") {
	return {
		uid: "line-1",
		meta: { salesRequestInterpretations: [interpretation] },
		formSteps: [{ stepId: 20, prodUid }],
	};
}

describe("sales request interpretations", () => {
	it("keeps an interpretation visible while its generated component is selected", () => {
		expect(getActiveSalesRequestInterpretations(line())).toEqual([
			interpretation,
		]);
	});

	it("removes a stale interpretation when the rep changes that selection", () => {
		const patch = reconcileSalesRequestInterpretations(line(), {
			formSteps: [{ stepId: 20, prodUid: "door-b" }],
		});

		expect(patch.meta?.salesRequestInterpretations).toEqual([]);
	});

	it("removes one dismissed interpretation from persisted line metadata", () => {
		const meta = removeSalesRequestInterpretationFromMeta(
			line().meta,
			interpretation,
		);

		expect(meta.salesRequestInterpretations).toEqual([]);
	});
});
