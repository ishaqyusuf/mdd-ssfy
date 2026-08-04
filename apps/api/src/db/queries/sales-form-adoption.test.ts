import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";

import {
	getSalesFormAdoption,
	recordSalesFormUsage,
	resetLegacySalesFormPreferences,
	setSalesFormPreference,
} from "./sales-form-adoption";

describe("sales form preference and adoption", () => {
	it("persists the authenticated user's preference with append-only evidence", async () => {
		const writes: Array<{ kind: string; input: unknown }> = [];
		const transaction = {
			salesFormPreference: {
				findUnique: async () => null,
				upsert: async (input: unknown) => {
					writes.push({ kind: "preference", input });
					return {
						userId: 7,
						mode: "LEGACY",
						source: "legacy_prompt",
						updatedAt: new Date("2026-07-30T12:00:00.000Z"),
					};
				},
			},
			event: {
				create: async (input: unknown) => {
					writes.push({ kind: "event", input });
					return { id: 1 };
				},
			},
		};
		const ctx = {
			userId: 7,
			db: {
				$transaction: async (callback: (tx: typeof transaction) => unknown) =>
					callback(transaction),
			},
		} as unknown as TRPCContext;

		const result = await setSalesFormPreference(ctx, {
			mode: "LEGACY",
			source: "legacy_prompt",
		});

		expect(result).toMatchObject({
			userId: 7,
			mode: "LEGACY",
			source: "legacy_prompt",
		});
		expect(writes).toEqual([
			{
				kind: "preference",
				input: {
					where: { userId: 7 },
					create: {
						userId: 7,
						mode: "LEGACY",
						source: "legacy_prompt",
						promptedAt: expect.any(Date),
					},
					update: {
						mode: "LEGACY",
						source: "legacy_prompt",
						promptedAt: expect.any(Date),
					},
					select: {
						userId: true,
						mode: true,
						source: true,
						updatedAt: true,
					},
				},
			},
			{
				kind: "event",
				input: {
					data: {
						type: "sales.form.preference",
						userId: 7,
						data: {
							action: "preference_set",
							previousMode: null,
							nextMode: "LEGACY",
							source: "legacy_prompt",
						},
					},
				},
			},
		]);
	});

	it("records privacy-bounded form usage dimensions", async () => {
		const creates: unknown[] = [];
		const ctx = {
			userId: 9,
			db: {
				pageView: {
					create: async (input: unknown) => {
						creates.push(input);
						return { id: 1, createdAt: new Date() };
					},
				},
			},
		} as unknown as TRPCContext;

		await recordSalesFormUsage(ctx, {
			surface: "new",
			type: "order",
			mode: "edit",
		});

		expect(creates).toEqual([
			{
				data: {
					url: "/sales-form/edit-order",
					group: "sales-form:new:order:edit",
					userId: 9,
				},
				select: { id: true, createdAt: true },
			},
		]);
	});

	it("keeps adoption analytics behind the Super Admin role", async () => {
		const ctx = {
			userId: 9,
			db: {
				users: {
					findFirst: async () => ({
						id: 9,
						roles: [{ role: { name: "Admin" } }],
					}),
				},
			},
		} as unknown as TRPCContext;

		expect(getSalesFormAdoption(ctx)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("resets each saved legacy preference with actor-attributed evidence", async () => {
		const writes: Array<{ kind: string; input: unknown }> = [];
		const transaction = {
			salesFormPreference: {
				findMany: async () => [{ userId: 12 }, { userId: 18 }],
				updateMany: async (input: unknown) => {
					writes.push({ kind: "preference", input });
					return { count: 1 };
				},
			},
			event: {
				create: async (input: unknown) => {
					writes.push({ kind: "event", input });
					return { id: writes.length };
				},
			},
		};
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirst: async () => ({
						id: 7,
						roles: [{ role: { name: "Super Admin" } }],
					}),
				},
				$transaction: async (callback: (tx: typeof transaction) => unknown) =>
					callback(transaction),
			},
		} as unknown as TRPCContext;

		await expect(resetLegacySalesFormPreferences(ctx)).resolves.toEqual({
			updatedCount: 2,
		});
		expect(writes).toEqual([
			{
				kind: "preference",
				input: {
					where: { userId: 12, mode: "LEGACY" },
					data: { mode: "NEW", source: "admin" },
				},
			},
			{
				kind: "event",
				input: {
					data: {
						type: "sales.form.preference",
						userId: 12,
						data: {
							action: "preference_reset",
							previousMode: "LEGACY",
							nextMode: "NEW",
							source: "admin",
							actorUserId: 7,
						},
					},
				},
			},
			{
				kind: "preference",
				input: {
					where: { userId: 18, mode: "LEGACY" },
					data: { mode: "NEW", source: "admin" },
				},
			},
			{
				kind: "event",
				input: {
					data: {
						type: "sales.form.preference",
						userId: 18,
						data: {
							action: "preference_reset",
							previousMode: "LEGACY",
							nextMode: "NEW",
							source: "admin",
							actorUserId: 7,
						},
					},
				},
			},
		]);
	});

	it("keeps the bulk reset behind the Super Admin role", async () => {
		const ctx = {
			userId: 9,
			db: {
				users: {
					findFirst: async () => ({
						id: 9,
						roles: [{ role: { name: "Sales Rep" } }],
					}),
				},
			},
		} as unknown as TRPCContext;

		expect(resetLegacySalesFormPreferences(ctx)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});
});
