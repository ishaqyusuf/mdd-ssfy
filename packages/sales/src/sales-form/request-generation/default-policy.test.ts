import { describe, expect, it } from "bun:test";
import { resolveRequestStepSelection } from "./default-policy";

describe("resolveRequestStepSelection", () => {
	it("selects an eligible default when the request omits the step", () => {
		expect(
			resolveRequestStepSelection({
				stepUid: "material",
				inputStatus: "omitted",
				requestedComponentUid: null,
				defaultComponentUid: "fiberglass",
				candidates: [{ uid: "fiberglass" }, { uid: "wood" }],
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
				defaultComponentUid: "fiberglass",
				candidates: [{ uid: "fiberglass" }, { uid: "wood" }],
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
			defaultComponentUid: "fiberglass",
			candidates: [{ uid: "fiberglass" }],
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
				defaultComponentUid: "fiberglass",
				candidates: [{ uid: "fiberglass", isDeleted: true }],
				resolvedStepUids: [],
			}),
		).toEqual({
			status: "unresolved",
			reason: "default-component-deleted",
		});
	});

	it("waits for isNot dependencies before applying a default", () => {
		expect(
			resolveRequestStepSelection({
				stepUid: "style",
				inputStatus: "omitted",
				requestedComponentUid: null,
				defaultComponentUid: "plain",
				candidates: [
					{
						uid: "plain",
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
			reason: "default-dependency-unresolved:material",
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
			defaultComponentUid: "six-panel",
			candidates: [{ uid: "six-panel", variations }],
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
			reason: "default-component-not-visible",
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
				defaultComponentUid: "flush",
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
