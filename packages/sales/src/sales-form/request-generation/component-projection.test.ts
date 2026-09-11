import { expect, test } from "bun:test";
import { projectRequestComponent } from "./component-projection";

test("exports component identity and visibility without prices or unrelated metadata", () => {
	expect(
		projectRequestComponent({
			uid: "door",
			name: "6 panel",
			deletedAt: null,
			meta: {
				price: 999,
				variations: [
					{
						rules: [
							{ stepUid: "type", operator: "is", componentsUid: ["exterior"] },
						],
					},
				],
			},
		}),
	).toEqual({
		uid: "door",
		title: "6 panel",
		redirectUid: null,
		variations: [
			{
				rules: [
					{ stepUid: "type", operator: "is", componentsUid: ["exterior"] },
				],
			},
		],
	});
});

test("deleted metadata and invalid visibility do not become unrestricted candidates", () => {
	expect(
		projectRequestComponent({
			uid: "old",
			name: "Old",
			meta: { deletedAt: "2026-01-01" },
		}),
	).toBeNull();
	expect(() =>
		projectRequestComponent({
			uid: "bad",
			name: "Bad",
			meta: { variations: "broken" },
		}),
	).toThrow();
});

test("excludes persisted custom components from the model projection", () => {
	expect(
		projectRequestComponent({
			uid: "custom-value",
			name: "CUSTOM VALUE",
			custom: true,
			meta: {},
		}),
	).toBeNull();
});

test("retains section behavior required to configure swing without including price", () => {
	const result = projectRequestComponent({
		uid: "slab",
		name: "Slab",
		meta: {
			sectionOverride: {
				overrideMode: true,
				noHandle: true,
				hasSwing: false,
				price: 123,
			},
		},
	});
	expect(result?.sectionOverride).toEqual({
		overrideMode: true,
		noHandle: true,
		hasSwing: false,
	});
});
