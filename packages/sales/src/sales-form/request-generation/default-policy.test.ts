import { describe, expect, it } from "bun:test";
import { resolveRequestStepSelection } from "./default-policy";

describe("resolveRequestStepSelection", () => {
	it("falls back to the first sorted candidate when none is marked", () => {
		expect(
			resolveRequestStepSelection({
				stepUid: "material",
				inputStatus: "omitted",
				requestedComponentUid: null,
				candidates: [{ uid: "first" }, { uid: "second" }],
				resolvedStepUids: [],
			}),
		).toEqual({
			status: "selected",
			componentUid: "first",
			source: "default",
		});
	});

	it("selects an eligible default when the request omits the step", () => {
		expect(
			resolveRequestStepSelection({
				stepUid: "material",
				inputStatus: "omitted",
				requestedComponentUid: null,
				candidates: [{ uid: "fiberglass", default: true }, { uid: "wood" }],
				resolvedStepUids: [],
			}),
		).toEqual({
			status: "selected",
			componentUid: "fiberglass",
			source: "default",
		});
	});

	it("does not replace an invalid explicit request with the default", () => {
		expect(
			resolveRequestStepSelection({
				stepUid: "material",
				inputStatus: "specified",
				requestedComponentUid: "steel",
				candidates: [{ uid: "fiberglass", default: true }, { uid: "wood" }],
				resolvedStepUids: [],
			}),
		).toEqual({
			status: "unresolved",
			reason: "requested-component-missing",
		});
	});

	it("keeps ambiguous and unreadable input unresolved", () => {
		const input = {
			stepUid: "material",
			requestedComponentUid: null,
			candidates: [{ uid: "fiberglass", default: true as const }],
			resolvedStepUids: [],
		} as const;

		expect(
			resolveRequestStepSelection({ ...input, inputStatus: "ambiguous" }),
		).toEqual({ status: "unresolved", reason: "input-ambiguous" });
		expect(
			resolveRequestStepSelection({ ...input, inputStatus: "unreadable" }),
		).toEqual({ status: "unresolved", reason: "input-unreadable" });
	});

	it("rejects a deleted default", () => {
		expect(
			resolveRequestStepSelection({
				stepUid: "material",
				inputStatus: "omitted",
				requestedComponentUid: null,
				candidates: [{ uid: "fiberglass", isDeleted: true, default: true }],
				resolvedStepUids: [],
			}),
		).toEqual({
			status: "unresolved",
			reason: "default-component-not-configured",
		});
	});

	it("waits for isNot dependencies before applying a default", () => {
		expect(
			resolveRequestStepSelection({
				stepUid: "style",
				inputStatus: "omitted",
				requestedComponentUid: null,
				candidates: [
					{
						uid: "plain",
						default: true,
						variations: [
							{
								rules: [
									{
										stepUid: "material",
										operator: "isNot",
										componentsUid: ["steel"],
									},
								],
							},
						],
					},
				],
				selectedByStepUid: {},
				resolvedStepUids: [],
			}),
		).toEqual({
			status: "unresolved",
			reason: "default-component-not-configured",
		});
	});

	it("uses the manual engine's AND-within and OR-across visibility semantics", () => {
		const variations = [
			{
				rules: [
					{
						stepUid: "material",
						operator: "is",
						componentsUid: ["wood"],
					},
					{
						stepUid: "finish",
						operator: "is",
						componentsUid: ["painted"],
					},
				],
			},
			{
				rules: [
					{
						stepUid: "material",
						operator: "is",
						componentsUid: ["fiberglass"],
					},
					{
						stepUid: "finish",
						operator: "isNot",
						componentsUid: ["unfinished"],
					},
				],
			},
		];
		const baseInput = {
			stepUid: "style",
			inputStatus: "omitted" as const,
			requestedComponentUid: null,
			candidates: [{ uid: "six-panel", default: true as const, variations }],
			resolvedStepUids: ["material", "finish"],
		};

		expect(
			resolveRequestStepSelection({
				...baseInput,
				selectedByStepUid: {
					material: "fiberglass",
					finish: "painted",
				},
			}),
		).toEqual({
			status: "selected",
			componentUid: "six-panel",
			source: "default",
		});
		expect(
			resolveRequestStepSelection({
				...baseInput,
				selectedByStepUid: {
					material: "fiberglass",
					finish: "unfinished",
				},
			}),
		).toEqual({
			status: "unresolved",
			reason: "default-component-not-configured",
		});
	});

	it("selects a visible explicit request and preserves its inputs", () => {
		const candidates = Object.freeze([
			Object.freeze({
				uid: "six-panel",
				variations: Object.freeze([
					Object.freeze({
						rules: Object.freeze([
							Object.freeze({
								stepUid: "material",
								operator: "is",
								componentsUid: Object.freeze(["fiberglass"]),
							}),
						]),
					}),
				]),
			}),
		]);
		const selectedByStepUid = Object.freeze({ material: "fiberglass" });
		const selectedProdUidsByStepUid = Object.freeze({
			material: Object.freeze(["wood", "fiberglass"]),
		});

		expect(
			resolveRequestStepSelection({
				stepUid: "style",
				inputStatus: "specified",
				requestedComponentUid: "six-panel",
				candidates: [...candidates, { uid: "flush" }],
				selectedByStepUid,
				selectedProdUidsByStepUid,
				resolvedStepUids: ["material"],
			}),
		).toEqual({
			status: "selected",
			componentUid: "six-panel",
			source: "request",
		});
		expect(selectedByStepUid).toEqual({ material: "fiberglass" });
		expect(selectedProdUidsByStepUid.material).toEqual(["wood", "fiberglass"]);
	});
});
