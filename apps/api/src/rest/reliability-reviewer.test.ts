import { expect, test } from "bun:test";
import { resolveReliabilityReviewer } from "./reliability-reviewer";

test("maps only authenticated configured users to explicit services", () => {
	const env = {
		RELIABILITY_REVIEWER_MEMBERSHIPS: JSON.stringify([
			{ userId: 4, serviceIds: ["gnd"] },
		]),
	};
	expect(resolveReliabilityReviewer(4, env)).toEqual({
		actorId: "user:4",
		serviceIds: ["gnd"],
	});
	expect(resolveReliabilityReviewer(5, env)).toBeNull();
	expect(resolveReliabilityReviewer(undefined, env)).toBeNull();
	expect(resolveReliabilityReviewer(4, {})).toBeNull();
});

test("rejects ambiguous or malformed membership configuration", () => {
	for (const entries of [
		[
			{ userId: 4, serviceIds: ["gnd"] },
			{ userId: 4, serviceIds: ["other"] },
		],
		[{ userId: 4, serviceIds: ["gnd", "gnd"] }],
		[{ userId: 4, serviceIds: ["*"] }],
		[{ userId: 4, serviceIds: ["gnd"], admin: true }],
	]) {
		expect(() =>
			resolveReliabilityReviewer(4, {
				RELIABILITY_REVIEWER_MEMBERSHIPS: JSON.stringify(entries),
			}),
		).toThrow("Invalid reliability reviewer configuration");
	}
});
