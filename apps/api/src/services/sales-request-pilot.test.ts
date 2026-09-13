import { describe, expect, it } from "bun:test";
import type { Database } from "@gnd/db";
import {
	getSalesRequestPilotAccess,
	requireActiveSalesRequestPilotActors,
	requireSalesRequestPilotAccess,
} from "./sales-request-pilot";

const settingId = 7;

function createDatabase(input: {
	meta?: unknown;
	activeUserIds?: number[];
}) {
	const activeUserIds = input.activeUserIds ?? [7, 19, 42];
	const db = {
		settings: {
			findMany: async () => [{ id: settingId }],
			findFirst: async () => ({ id: settingId, meta: input.meta ?? {} }),
		},
		users: {
			findFirst: async ({ where }: { where: { id: number } }) =>
				activeUserIds.includes(where.id) ? { id: where.id } : null,
			findMany: async ({ where }: { where: { id: { in: number[] } } }) =>
				where.id.in
					.filter((id) => activeUserIds.includes(id))
					.map((id) => ({ id })),
		},
	} as unknown as Database;
	return db;
}

function pilotMeta(overrides?: Record<string, unknown>) {
	return {
		requestGeneration: {
			pilot: {
				enabled: true,
				cohortUserIds: [19],
				reviewerUserIds: [42],
				revision: 3,
				changedAt: "2026-09-13T12:00:00.000Z",
				...overrides,
			},
		},
	};
}

function withFlag(value: string | undefined) {
	const previous = process.env.SALES_REQUEST_AI_ENABLED;
	process.env.SALES_REQUEST_AI_ENABLED = value;
	return () => {
		if (previous === undefined)
			process.env.SALES_REQUEST_AI_ENABLED = undefined;
		else process.env.SALES_REQUEST_AI_ENABLED = previous;
	};
}

describe("sales request pilot access", () => {
	it("requires every configured cohort and reviewer identity to be active", async () => {
		await expect(
			requireActiveSalesRequestPilotActors({
				db: createDatabase({ activeUserIds: [19] }),
				cohortUserIds: [19, 77],
				reviewerUserIds: [42],
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "Pilot users must be active: 42, 77",
		});
	});

	it("fails closed when the global rollback flag is off", async () => {
		const restore = withFlag("false");
		try {
			const access = await getSalesRequestPilotAccess({
				db: createDatabase({ meta: pilotMeta() }),
				userId: 19,
				surface: "order",
			});
			expect(access).toMatchObject({
				featureEnabled: false,
				pilotEnabled: true,
				eligible: false,
				reason: "feature-disabled",
			});
			await expect(
				requireSalesRequestPilotAccess({
					db: createDatabase({ meta: pilotMeta() }),
					userId: 19,
					surface: "order",
				}),
			).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		} finally {
			restore();
		}
	});

	it("keeps an absent pilot configuration disabled", async () => {
		const restore = withFlag("true");
		try {
			expect(
				await getSalesRequestPilotAccess({
					db: createDatabase({}),
					userId: 19,
					surface: "quote",
				}),
			).toMatchObject({
				featureEnabled: true,
				pilotEnabled: false,
				eligible: false,
				reason: "pilot-disabled",
			});
		} finally {
			restore();
		}
	});

	it("admits only named cohort/reviewer users on both create surfaces", async () => {
		const restore = withFlag("true");
		try {
			for (const surface of ["order", "quote"] as const) {
				await expect(
					requireSalesRequestPilotAccess({
						db: createDatabase({ meta: pilotMeta() }),
						userId: 19,
						surface,
					}),
				).resolves.toMatchObject({
					eligible: true,
					cohortMember: true,
					reviewer: false,
					reason: "eligible",
				});
				await expect(
					requireSalesRequestPilotAccess({
						db: createDatabase({ meta: pilotMeta() }),
						userId: 42,
						surface,
					}),
				).resolves.toMatchObject({
					eligible: true,
					cohortMember: false,
					reviewer: true,
					reason: "eligible",
				});
			}
		} finally {
			restore();
		}
	});

	it("rejects an active user outside the named lists", async () => {
		const restore = withFlag("true");
		try {
			await expect(
				requireSalesRequestPilotAccess({
					db: createDatabase({ meta: pilotMeta() }),
					userId: 7,
					surface: "order",
				}),
			).rejects.toMatchObject({
				code: "FORBIDDEN",
				message:
					"Sales request generation is limited to the configured internal pilot cohort.",
			});
		} finally {
			restore();
		}
	});

	it("does not admit missing or inactive actors", async () => {
		const restore = withFlag("true");
		try {
			await expect(
				requireSalesRequestPilotAccess({
					db: createDatabase({ meta: pilotMeta() }),
					surface: "order",
				}),
			).rejects.toMatchObject({ code: "UNAUTHORIZED" });
			await expect(
				requireSalesRequestPilotAccess({
					db: createDatabase({ meta: pilotMeta(), activeUserIds: [] }),
					userId: 19,
					surface: "order",
				}),
			).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		} finally {
			restore();
		}
	});

	it("rejects an absent creation surface before eligibility", async () => {
		const restore = withFlag("true");
		try {
			const access = await getSalesRequestPilotAccess({
				db: createDatabase({ meta: pilotMeta() }),
				userId: 19,
				surface: null,
			});
			expect(access).toMatchObject({
				eligible: false,
				reason: "surface-not-supported",
			});
			await expect(
				requireSalesRequestPilotAccess({
					db: createDatabase({ meta: pilotMeta() }),
					userId: 19,
					surface: null,
				}),
			).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		} finally {
			restore();
		}
	});

	it("rejects malformed enabled configuration", async () => {
		const restore = withFlag("true");
		try {
			await expect(
				requireSalesRequestPilotAccess({
					db: createDatabase({
						meta: pilotMeta({ reviewerUserIds: [] }),
					}),
					userId: 19,
					surface: "quote",
				}),
			).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		} finally {
			restore();
		}
	});
});
