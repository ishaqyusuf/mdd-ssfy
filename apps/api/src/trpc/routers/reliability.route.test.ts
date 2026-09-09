import { expect, test } from "bun:test";
import { db } from "@gnd/db";
import { reliabilityRouter } from "./reliability.route";

const input = { incidentId: "fixture", serviceId: "gnd", revision: 1 };

test("preview route rejects unauthenticated callers", async () => {
	await expect(
		reliabilityRouter.createCaller({ db }).preview(input),
	).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("preview route enforces server service membership and rejects injected principals", async () => {
	const previous = process.env.RELIABILITY_REVIEWER_MEMBERSHIPS;
	process.env.RELIABILITY_REVIEWER_MEMBERSHIPS = JSON.stringify([
		{ userId: 42, serviceIds: ["other"] },
	]);
	try {
		const caller = reliabilityRouter.createCaller({ db, userId: 42 });
		expect(await caller.services()).toEqual({ serviceIds: ["other"] });
		expect(
			await reliabilityRouter.createCaller({ db, userId: 43 }).services(),
		).toEqual({ serviceIds: [] });
		await expect(caller.preview(input)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		const injectedInput = { ...input, actorId: "admin" };
		await expect(caller.preview(injectedInput)).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		await expect(
			reliabilityRouter.createCaller({ db, userId: 43 }).preview(input),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	} finally {
		if (previous === undefined)
			Reflect.deleteProperty(process.env, "RELIABILITY_REVIEWER_MEMBERSHIPS");
		else process.env.RELIABILITY_REVIEWER_MEMBERSHIPS = previous;
	}
});
