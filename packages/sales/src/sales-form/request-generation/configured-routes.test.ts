import { expect, test } from "bun:test";
import {
	getConfiguredRequestRoutes,
	getConfiguredRequestStepUids,
} from "./configured-routes";

test("component scope follows configured sequences, excluding stale route-map steps", () => {
	const routes = getConfiguredRequestRoutes({
		route: {
			exterior: {
				routeSequence: [{ uid: "material" }, { uid: "frame" }],
				route: { frame: "obsolete" },
			},
			interior: {
				routeSequence: [{ uid: "material" }, { uid: "height" }, { uid: "" }],
			},
		},
	});
	expect(getConfiguredRequestStepUids(routes)).toEqual([
		"frame",
		"height",
		"material",
	]);
	expect(routes[0]?.stepUids).toEqual(["material", "frame"]);
});

test("nested legacy settings work without collecting unrelated metadata", () => {
	const routes = getConfiguredRequestRoutes(
		JSON.stringify({
			data: {
				route: {
					door: { routeSequence: [{ uid: "height" }] },
				},
			},
			wizard: { uid: "unused" },
		}),
	);
	expect(getConfiguredRequestStepUids(routes)).toEqual(["height"]);
});

test("duplicate step identities match the new form's highest-ID authority", async () => {
	const { resolveConfiguredRequestSteps } = await import("./configured-routes");
	expect(
		resolveConfiguredRequestSteps(
			["height"],
			[
				{ id: 21, uid: "height", title: "Old height" },
				{ id: 41, uid: "height", title: "Door type" },
			],
		),
	).toEqual([{ id: 41, uid: "height", title: "Door type" }]);
});
