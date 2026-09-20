import { expect, test } from "bun:test";
import { projectInteractiveNewSalesFormRouting } from "./new-sales-form";

test("interactive routing keeps root cards and non-root lookup identity without image metadata", () => {
	const root = {
		id: 1, uid: "root", title: "Item Type", meta: { route: true },
		components: [{ id: 2, uid: "prehung", title: "Pre-Hung", redirectUid: null,
			img: "root.png", meta: { default: true } }],
	};
	const door = {
		id: 51, uid: "door", title: "Door", meta: { priceStepDeps: ["height"] },
		components: [{ id: 72, uid: "slab", title: "Slab", redirectUid: "next",
			img: "large-image-url", meta: { variations: ["large-rule"] } }],
	};
	const routing = {
		settingId: 1,
		settingsMeta: {},
		composedRouter: { prehung: { routeSequence: [{ uid: "door" }], route: { prehung: "door" } } },
		stepsByUid: { root, door },
		stepsById: { 1: "root", 51: "door" },
		rootStepUid: "root",
		rootComponents: root.components,
	};

	const projected = projectInteractiveNewSalesFormRouting(routing);
	expect(projected.rootComponents).toEqual(root.components);
	expect(projected.stepsByUid.root).toEqual(root);
	expect(projected.stepsByUid.door?.meta).toEqual(door.meta);
	expect(projected.stepsByUid.door?.components).toEqual([{
		id: 72, uid: "slab", title: "Slab", redirectUid: "next", img: null, meta: null,
	}]);
	expect(routing.stepsByUid.door.components[0]?.img).toBe("large-image-url");
});
