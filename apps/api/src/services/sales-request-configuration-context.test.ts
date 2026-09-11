import { expect, test } from "bun:test";
import { attachSalesRequestServiceVocabulary } from "./sales-request-configuration-context";

const snapshot = {
	settingId: 3,
	scope: "sales-settings:3",
	revision: "structural",
	configuration: {
		schemaVersion: 1 as const,
		routes: [],
		steps: [],
		visibilityByComponentUid: {},
	},
	configurationJson: "{}",
};

test("binds the name-only service vocabulary into the exact model configuration revision", () => {
	const first = attachSalesRequestServiceVocabulary(snapshot, ["INSTALLATION"]);
	const second = attachSalesRequestServiceVocabulary(snapshot, ["CUT DOWN"]);
	expect(first.configuration.serviceNames).toEqual(["INSTALLATION"]);
	expect(first.configurationJson).not.toContain("price");
	expect(first.revision).toMatch(/^[a-f0-9]{64}$/);
	expect(first.revision).not.toBe(second.revision);
});
