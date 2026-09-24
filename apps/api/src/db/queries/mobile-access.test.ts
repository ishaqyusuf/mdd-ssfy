import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { updateMobileAccessRequest } from "./mobile-access";

function reviewContext(status: "REQUESTED" | "APPROVED", changedCount: number) {
	let updateWhere: Record<string, unknown> | undefined;
	let eventWrites = 0;
	const actor = {
		id: 11,
		name: "Reviewer",
		email: "reviewer@example.test",
		roles: [{ role: { name: "Super Admin" } }],
	};
	const request = {
		id: 42,
		userId: 27,
		platform: "ANDROID" as const,
		status,
		internalNote: null,
		requester: { name: "Employee", email: "employee@example.test" },
	};
	const tx = {
		mobileAccessRequest: {
			findUnique: async () => request,
			updateMany: async ({ where }: { where: Record<string, unknown> }) => {
				updateWhere = where;
				return { count: changedCount };
			},
			findUniqueOrThrow: async () => request,
		},
		mobileAccessRequestEvent: {
			create: async () => {
				eventWrites += 1;
			},
		},
		notifications: { create: async () => undefined },
	};
	const ctx = {
		userId: actor.id,
		db: {
			users: { findFirst: async () => actor },
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		},
	} as unknown as TRPCContext;
	return {
		ctx,
		getWhere: () => updateWhere,
		getEventWrites: () => eventWrites,
	};
}

describe("mobile access admin review liveness", () => {
	it("blocks advancement when the requester is no longer a live company member", async () => {
		const harness = reviewContext("REQUESTED", 0);
		await expect(
			updateMobileAccessRequest(harness.ctx, {
				id: 42,
				status: "APPROVED",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(harness.getWhere()).toMatchObject({
			id: 42,
			status: "REQUESTED",
			requester: {
				is: {
					deletedAt: null,
					accessRevokedAt: null,
					roles: { some: { deletedAt: null } },
				},
			},
		});
		expect(harness.getEventWrites()).toBe(0);
	});

	it("still permits an admin to cancel an old request", async () => {
		const harness = reviewContext("APPROVED", 1);
		await updateMobileAccessRequest(harness.ctx, {
			id: 42,
			status: "CANCELLED",
		});
		expect(harness.getWhere()).toEqual({ id: 42, status: "APPROVED" });
		expect(harness.getEventWrites()).toBe(1);
	});
});
