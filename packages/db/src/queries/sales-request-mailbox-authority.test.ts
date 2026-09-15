import { describe, expect, test } from "bun:test";
import { createSalesRequestMailboxAuthorityResolvers } from "./sales-request-mailbox-authority";

const policy = {
	enabled: true,
	supportedProviders: ["gmail"] as const,
	eligibleUserIds: [42],
	retentionDays: 30,
	maximumAutomationMode: "manual" as const,
	emergencyDisabled: false,
	allowAttachments: false,
	maxAttachmentBytes: 0,
	revision: 7,
	changedAt: "2026-09-13T17:00:00.000Z",
};

function database(overrides?: {
	userUpdatedAt?: Date;
	profileUpdatedAt?: Date;
	organizationUpdatedAt?: Date;
	employeeProfileId?: number;
	roleId?: number;
	organizationId?: number;
	settingsId?: number;
}) {
	const employeeProfileId = overrides?.employeeProfileId ?? 12;
	const organizationId = overrides?.organizationId ?? 40;
	return {
		users: {
			findFirst: async () => ({
				id: 42,
				employeeProfileId,
				updatedAt:
					overrides?.userUpdatedAt ?? new Date("2026-09-13T15:00:00.000Z"),
				employeeProfile: {
					id: employeeProfileId,
					updatedAt:
						overrides?.profileUpdatedAt ?? new Date("2026-09-13T14:00:00.000Z"),
				},
				roles: [
					{
						roleId: overrides?.roleId ?? 3,
						organizationId,
						organization: {
							id: organizationId,
							updatedAt:
								overrides?.organizationUpdatedAt ??
								new Date("2026-09-13T13:00:00.000Z"),
						},
					},
				],
			}),
		},
		settings: {
			findMany: async () => [
				{
					id: overrides?.settingsId ?? 9,
					updatedAt: new Date("2026-09-13T16:00:00.000Z"),
				},
			],
		},
	};
}

describe("Sales Request mailbox authority resolvers", () => {
	test("binds the active employee to the canonical office and current policy", async () => {
		const resolvers = createSalesRequestMailboxAuthorityResolvers({
			readPolicy: async () => ({ settingId: 9, source: "persisted", policy }),
		});
		const result = await resolvers.resolvePersistenceAuthority(
			database() as never,
			{
				actorUserId: 42,
				provider: "gmail",
				now: new Date("2026-09-13T17:00:00.000Z"),
				purpose: "connect",
			},
		);

		expect(result).toMatchObject({
			kind: "authorized",
			authority: {
				ownerUserId: 42,
				employeeProfileId: 12,
				organizationId: 40,
				salesSettingsId: 9,
				salesSettingsRevision: 7,
				policyRevision: 7,
				providerEligible: true,
			},
		});
		expect(
			result.kind === "authorized" && result.authority.officeAuthorityKey,
		).toMatch(/^mbo1:[a-f0-9]{64}$/);
		expect(
			result.kind === "authorized" && result.authority.authorityRevision,
		).toMatch(/^mba1:[a-f0-9]{64}$/);
		if (result.kind !== "authorized") throw new Error("expected authority");
		await expect(
			resolvers.resolveContentAuthority(database() as never, {
				provider: "gmail",
				ownerUserId: 42,
				organizationId: 40,
				employeeProfileId: 12,
				officeAuthorityKey: result.authority.officeAuthorityKey,
				authorityRevision: result.authority.authorityRevision,
				salesSettingsId: 9,
				salesSettingsRevision: 7,
				policyRevision: 7,
			}),
		).resolves.toMatchObject({ current: true, ownerActive: true, policy });
	});

	test("ignores unrelated row timestamp churn while fencing authority facts", async () => {
		const resolvers = createSalesRequestMailboxAuthorityResolvers({
			readPolicy: async (_db, settingId) => ({
				settingId,
				source: "persisted",
				policy,
			}),
		});
		const resolve = (db: ReturnType<typeof database>) =>
			resolvers.resolvePersistenceAuthority(db as never, {
				actorUserId: 42,
				provider: "gmail",
				now: new Date("2026-09-13T17:00:00.000Z"),
				purpose: "connect",
			});
		const baseline = await resolve(database());
		const timestampOnly = await resolve(
			database({
				userUpdatedAt: new Date("2026-09-14T15:00:00.000Z"),
				profileUpdatedAt: new Date("2026-09-14T14:00:00.000Z"),
				organizationUpdatedAt: new Date("2026-09-14T13:00:00.000Z"),
			}),
		);
		const profileChanged = await resolve(database({ employeeProfileId: 13 }));
		const officeChanged = await resolve(
			database({ organizationId: 41, roleId: 4 }),
		);
		const settingsChanged = await resolve(database({ settingsId: 10 }));
		const policyChangedResolvers = createSalesRequestMailboxAuthorityResolvers({
			readPolicy: async (_db, settingId) => ({
				settingId,
				source: "persisted",
				policy: {
					...policy,
					revision: 8,
					changedAt: "2026-09-14T17:00:00.000Z",
				},
			}),
		});
		const policyChanged =
			await policyChangedResolvers.resolvePersistenceAuthority(
				database() as never,
				{
					actorUserId: 42,
					provider: "gmail",
					now: new Date("2026-09-13T17:00:00.000Z"),
					purpose: "connect",
				},
			);
		for (const result of [
			baseline,
			timestampOnly,
			profileChanged,
			officeChanged,
			settingsChanged,
			policyChanged,
		]) {
			if (result.kind !== "authorized") throw new Error("expected authority");
		}
		if (
			baseline.kind !== "authorized" ||
			timestampOnly.kind !== "authorized" ||
			profileChanged.kind !== "authorized" ||
			officeChanged.kind !== "authorized" ||
			settingsChanged.kind !== "authorized" ||
			policyChanged.kind !== "authorized"
		) {
			throw new Error("expected authority");
		}

		expect(timestampOnly.authority.officeAuthorityKey).toBe(
			baseline.authority.officeAuthorityKey,
		);
		expect(timestampOnly.authority.authorityRevision).toBe(
			baseline.authority.authorityRevision,
		);
		expect(profileChanged.authority.officeAuthorityKey).not.toBe(
			baseline.authority.officeAuthorityKey,
		);
		expect(officeChanged.authority.officeAuthorityKey).not.toBe(
			baseline.authority.officeAuthorityKey,
		);
		expect(settingsChanged.authority.authorityRevision).not.toBe(
			baseline.authority.authorityRevision,
		);
		expect(policyChanged.authority.officeAuthorityKey).toBe(
			baseline.authority.officeAuthorityKey,
		);
		expect(policyChanged.authority.authorityRevision).not.toBe(
			baseline.authority.authorityRevision,
		);
	});

	test("fails closed when the policy is not persisted and marks drift for content", async () => {
		const resolvers = createSalesRequestMailboxAuthorityResolvers({
			readPolicy: async () => ({ settingId: 9, source: "default", policy }),
		});
		await expect(
			resolvers.resolvePersistenceAuthority(database() as never, {
				actorUserId: 42,
				provider: "gmail",
				now: new Date(),
				purpose: "connect",
			}),
		).resolves.toEqual({ kind: "rejected", reason: "settings-unavailable" });
	});

	test("scopes connection lists to current office identity and rejects revoked users", async () => {
		const resolvers = createSalesRequestMailboxAuthorityResolvers({
			readPolicy: async () => {
				throw new Error("connection lists must not require policy reads");
			},
		});
		const current = await resolvers.resolveConnectionListAuthority(
			database() as never,
			{ actorUserId: 42 },
		);
		const movedOffice = await resolvers.resolveConnectionListAuthority(
			database({ organizationId: 41, roleId: 4 }) as never,
			{ actorUserId: 42 },
		);
		if (current.kind !== "authorized" || movedOffice.kind !== "authorized") {
			throw new Error("expected current authority identities");
		}

		expect(current.authority).toEqual({
			ownerUserId: 42,
			employeeProfileId: 12,
			organizationId: 40,
			officeAuthorityKey: expect.stringMatching(/^mbo1:[a-f0-9]{64}$/),
		});
		expect(movedOffice.authority).toMatchObject({
			ownerUserId: 42,
			employeeProfileId: 12,
			organizationId: 41,
		});
		expect(movedOffice.authority.officeAuthorityKey).not.toBe(
			current.authority.officeAuthorityKey,
		);

		const revoked = {
			...database(),
			users: { findFirst: async () => null },
		};
		await expect(
			resolvers.resolveConnectionListAuthority(revoked as never, {
				actorUserId: 42,
			}),
		).resolves.toEqual({ kind: "rejected", reason: "employee-inactive" });
	});
});
