import { describe, expect, it } from "bun:test";
import { Prisma } from "@prisma/client";
import { ensureContractorJobEarning } from "./contractor-job-earning";

const originalDate = new Date("2026-09-29T17:47:28.361Z");
const payoutDate = new Date("2026-09-30T15:36:53Z");
const input = {
	contractorId: 62,
	jobId: 22334,
	amount: 400,
	effectiveAt: payoutDate,
	createdById: 12,
};

function fixture(reversals = 0, missing = false, closed = false) {
	const entries = missing
		? []
		: [
				{
					id: "earning",
					contractorId: 62,
					jobId: 22334,
					type: "JOB_EARNED",
					sourceType: "JOB",
					sourceId: "22334",
					sourceKey: "JOB:22334",
					amount: new Prisma.Decimal(400),
					liabilityDelta: new Prisma.Decimal(400),
					effectiveAt: originalDate,
					reversedBy: null as { id: string } | null,
					reversalOfId: null as string | null,
				},
			];
	for (let index = 0; index < reversals; index++) {
		const previous = entries.at(-1);
		if (!previous) throw new Error("Missing fixture earning");
		const id = `reversal-${index}`;
		previous.reversedBy = { id };
		entries.push({
			...previous,
			id,
			type: "REVERSAL",
			sourceKey: id,
			liabilityDelta: previous.liabilityDelta.negated(),
			reversalOfId: previous.id,
			reversedBy: null,
		});
	}
	let created = 0;
	const db = {
		contractorAccountingPeriod: {
			findFirst: async () => (closed ? { id: "closed" } : null),
		},
		contractorLedgerEntry: {
			findUnique: async ({
				where,
			}: { where: { id?: string; sourceKey?: string } }) =>
				entries.find((entry) =>
					where.id
						? entry.id === where.id
						: entry.sourceKey === where.sourceKey,
				) ?? null,
			create: async ({ data }: { data: Record<string, unknown> }) => {
				const entry = {
					...data,
					id: `created-${created++}`,
					reversedBy: null,
					amount: new Prisma.Decimal(data.amount as Prisma.Decimal),
					liabilityDelta: new Prisma.Decimal(
						data.liabilityDelta as Prisma.Decimal,
					),
				} as (typeof entries)[number];
				if (entry.reversalOfId) {
					const previous = entries.find((row) => row.id === entry.reversalOfId);
					if (!previous) throw new Error("Missing fixture reversal source");
					previous.reversedBy = { id: entry.id };
				}
				entries.push(entry);
				return entry;
			},
		},
	};
	return {
		entries,
		created: () => created,
		run: () => ensureContractorJobEarning(db as never, input),
	};
}

describe("contractor job earning lifecycle", () => {
	it("posts an earning for new work once and retains it on retry", async () => {
		const state = fixture(0, true);
		await state.run();
		await state.run();
		expect(state.created()).toBe(1);
		expect(state.entries[0].sourceKey).toBe("JOB:22334");
	});
	for (const depth of [1, 3]) {
		it(`restores a rejected earning at reversal depth ${depth} once`, async () => {
			const state = fixture(depth);
			await state.run();
			await state.run();
			expect(state.created()).toBe(1);
			expect(state.entries.at(-1)).toMatchObject({
				type: "REVERSAL",
				effectiveAt: payoutDate,
				createdById: 12,
			});
			expect(state.entries[0].effectiveAt).toEqual(originalDate);
			expect(
				state.entries
					.reduce(
						(sum, entry) => sum.plus(entry.liabilityDelta),
						new Prisma.Decimal(0),
					)
					.toNumber(),
			).toBe(400);
		});
	}
	it("reuses an already restored earning", async () => {
		const state = fixture(2);
		await state.run();
		expect(state.created()).toBe(0);
	});
	it("rejects a corrupt reversal chain", async () => {
		const state = fixture(1);
		state.entries[1].liabilityDelta = new Prisma.Decimal(-399);
		await expect(state.run()).rejects.toThrow("inconsistent reversal chain");
		expect(state.created()).toBe(0);
	});
	it("cannot restore an earning inside a closed accounting period", async () => {
		const state = fixture(1, false, true);
		await expect(state.run()).rejects.toThrow("accounting period is closed");
		expect(state.created()).toBe(0);
	});
});
