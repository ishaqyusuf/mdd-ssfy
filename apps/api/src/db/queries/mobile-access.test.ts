import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import {
	requestMobileAccess,
	updateMobileAccessRequest,
} from "./mobile-access";

function requestContext({
	currentEmployee,
	changedCount = 1,
}: {
	currentEmployee: boolean;
	changedCount?: number;
}) {
	let requestReads = 0;
	let eventWrites = 0;
	let updateWhere: Record<string, unknown> | undefined;
	let updateData: Record<string, unknown> | undefined;
	const employee = { id: 27, name: "Employee", email: "employee@example.test" };
	const existing = { id: 42, userId: 27, platform: "IOS", status: "REJECTED" };
	const tx = {
		users: {
			findFirst: async () => (currentEmployee ? { id: employee.id } : null),
			findMany: async () => [],
		},
		mobileAccessRequest: {
			findUnique: async () => {
				requestReads += 1;
				return existing;
			},
			updateMany: async ({
				where,
				data,
			}: {
				where: Record<string, unknown>;
				data: Record<string, unknown>;
			}) => {
				updateWhere = where;
				updateData = data;
				return { count: changedCount };
			},
			findUniqueOrThrow: async () => existing,
		},
		mobileAccessRequestEvent: {
			create: async () => {
				eventWrites += 1;
			},
		},
	};
	const ctx = {
		userId: employee.id,
		db: {
			users: { findFirst: async () => employee },
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		},
	} as unknown as TRPCContext;
	return {
		ctx,
		getRequestReads: () => requestReads,
		getEventWrites: () => eventWrites,
		getUpdateWhere: () => updateWhere,
		getUpdateData: () => updateData,
	};
}

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

describe("mobile access employee re-request liveness", () => {
	it("denies a request when membership was revoked before the transaction", async () => {
		const harness = requestContext({ currentEmployee: false });
		await expect(
			requestMobileAccess(harness.ctx, { platform: "IOS" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(harness.getRequestReads()).toBe(0);
		expect(harness.getEventWrites()).toBe(0);
	});

	it("uses a live-member and status compare-and-set before reopening", async () => {
		const harness = requestContext({
			currentEmployee: true,
			changedCount: 0,
		});
		await expect(
			requestMobileAccess(harness.ctx, { platform: "IOS" }),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(harness.getUpdateWhere()).toMatchObject({
			id: 42,
			status: "REJECTED",
			requester: {
				is: { deletedAt: null, accessRevokedAt: null },
			},
		});
		expect(harness.getEventWrites()).toBe(0);
	});

	it("reopens an unchanged request and clears old invitation metadata", async () => {
		const harness = requestContext({ currentEmployee: true });
		await requestMobileAccess(harness.ctx, { platform: "IOS" });
		expect(harness.getEventWrites()).toBe(1);
		expect(harness.getUpdateData()).toMatchObject({
			status: "REQUESTED",
			invitationProvider: null,
			externalReference: null,
			internalNote: null,
			reviewedById: null,
		});
	});
});
