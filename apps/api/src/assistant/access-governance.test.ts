import { describe, expect, mock, test } from "bun:test";
import {
	AssistantEntitlementConflictError,
	getAssistantAccessState,
	updateAssistantEntitlement,
} from "./access-governance";

const now = new Date("2026-09-13T12:00:00.000Z");
const entitlement = {
	id: "entitlement-1",
	userId: 42,
	enabled: true,
	expiresAt: null,
	version: 1,
};

describe("Assistant individual access", () => {
	test("fails closed without an active individual entitlement", async () => {
		const state = await getAssistantAccessState(
			{
				users: { findFirst: mock(async () => ({ id: 42 })) },
				assistantUserEntitlement: { findUnique: mock(async () => null) },
			} as never,
			42,
			now,
		);
		expect(state).toEqual({
			enabled: false,
			status: "disabled",
			expiresAt: null,
			version: 0,
		});
	});

	test("expires access once and appends an immutable audit event", async () => {
		const eventCreate = mock(async () => ({}));
		const expired = {
			...entitlement,
			expiresAt: new Date("2026-09-13T11:59:59.000Z"),
		};
		const db = {
			users: { findFirst: mock(async () => ({ id: 42 })) },
			assistantUserEntitlement: {
				findUnique: mock(async () => expired),
				updateMany: mock(async () => ({ count: 1 })),
			},
			assistantEntitlementEvent: { create: eventCreate },
			$transaction: async (callback) => callback(db),
		};
		const state = await getAssistantAccessState(db as never, 42, now);
		expect(state.status).toBe("expired");
		expect(state.enabled).toBe(false);
		expect(eventCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				type: "expired",
				enabled: false,
				actorUserId: null,
				entitlementVersion: 2,
			}),
		});
	});

	test("updates access with optimistic concurrency and one audit event", async () => {
		const eventCreate = mock(async () => ({}));
		const db = {
			users: { findFirst: mock(async () => ({ id: 42 })) },
			assistantUserEntitlement: {
				findUnique: mock(async () => entitlement),
				updateMany: mock(async () => ({ count: 1 })),
			},
			assistantEntitlementEvent: { create: eventCreate },
			$transaction: async (callback) => callback(db),
		};
		const state = await updateAssistantEntitlement(
			db as never,
			7,
			{
				userId: 42,
				enabled: false,
				expiresAt: null,
				reason: "Pilot access ended",
				expectedVersion: 1,
			},
			now,
		);
		expect(state).toMatchObject({
			enabled: false,
			status: "disabled",
			version: 2,
		});
		expect(eventCreate).toHaveBeenCalledTimes(1);
		const conflictDb: Record<string, unknown> = {
			...db,
			assistantUserEntitlement: {
				...db.assistantUserEntitlement,
				findUnique: mock(async () => ({ ...entitlement, version: 2 })),
			},
		};
		conflictDb.$transaction = async (callback) => callback(conflictDb);
		await expect(
			updateAssistantEntitlement(
				conflictDb as never,
				7,
				{
					userId: 42,
					enabled: true,
					expiresAt: null,
					reason: "Restore pilot access",
					expectedVersion: 1,
				},
				now,
			),
		).rejects.toBeInstanceOf(AssistantEntitlementConflictError);
	});
});
