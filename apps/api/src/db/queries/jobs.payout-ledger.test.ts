import { describe, expect, it, mock } from "bun:test";
import { Prisma } from "@gnd/db";

mock.module("@notifications/services/triggers", () => ({
	NotificationService: class {
		channel = { jobPaymentSent: async () => {} };
		setEmployeeRecipients() {
			return this;
		}
	},
}));
const { createPaymentPortal } = await import("./jobs");

const jobIds = [
	22334, 22339, 22346, 22347, 22470, 22471, 22472, 22539, 22540, 22541, 22543,
	22584, 22585, 22595,
];
const amounts = [
	400, 370.24, 600, 600, 654, 640, 450, 470.68, 500, 250, 250, 384.24, 155, 350,
];
const earnedAt = new Date("2026-09-29T17:47:28.361Z");

function fixture({
	submitted = false,
	precisionOnly = false,
	claimedCount = 14,
	ledgerContractor = 62,
	changedAmount = false,
	closedOriginalPeriod = false,
} = {}) {
	const jobs = jobIds.map((id, index) => ({
		id,
		amount: amounts[index] ?? 0,
		controlId: `J-${id}`,
		status: submitted ? "Submitted" : "Approved",
		title: "Test job",
		subtitle: null,
		description: null,
		isCustom: true,
		project: null,
		home: null,
		createdAt: new Date("2026-09-11T14:58:02Z"),
		approvedAt: precisionOnly
			? new Date("2026-09-29T17:47:28Z")
			: new Date("2026-09-30T15:36:53Z"),
		statusDate: new Date("2026-09-30T15:36:53Z"),
	}));
	const entries = jobs.map((job) => ({
		id: `earned-${job.id}`,
		sourceKey: `JOB:${job.id}`,
		contractorId: ledgerContractor,
		type: "JOB_EARNED",
		sourceType: "JOB",
		sourceId: String(job.id),
		jobId: job.id,
		amount: new Prisma.Decimal(changedAmount ? job.amount + 1 : job.amount),
		liabilityDelta: new Prisma.Decimal(job.amount),
		effectiveAt: earnedAt,
		reversedBy: null,
	}));
	const created: Prisma.ContractorLedgerEntryUncheckedCreateInput[] = [];
	const jobUpdates: Prisma.JobsUpdateManyArgs[] = [];
	let committed = false;
	const db = {
		jobs: {
			findMany: async () => jobs,
			updateMany: async (args: Prisma.JobsUpdateManyArgs) => {
				jobUpdates.push(args);
				return { count: claimedCount };
			},
		},
		users: {
			findFirst: async () => ({ id: 62, employeeProfile: { discount: 0 } }),
		},
		contractorAccountingPeriod: {
			findFirst: async ({ where }: { where: { from: { lte: Date } } }) =>
				closedOriginalPeriod &&
				where.from.lte < new Date("2026-09-30T00:00:00Z")
					? { id: "closed-september-29" }
					: null,
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
			create: async ({
				data,
			}: { data: Prisma.ContractorLedgerEntryUncheckedCreateInput }) => {
				created.push(data);
				const entry = { id: `new-${data.sourceKey}`, ...data };
				return entry;
			},
		},
		jobPayments: {
			create: async () => ({
				id: 1,
				amount: new Prisma.Decimal("6074.16"),
				createdAt: new Date(),
				adjustments: [],
			}),
		},
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
			const result = await callback(db);
			committed = true;
			return result;
		},
	};
	return {
		run: () =>
			createPaymentPortal(
				{ db, userId: 12 } as never,
				{
					userId: 62,
					jobIds,
					paymentMethod: "Check",
					checkNo: "0000",
					adjustment: 0,
					discount: 0,
				},
				{ saveNote: async () => ({}) as never },
			),
		created,
		entries,
		jobUpdates,
		committed: () => committed,
	};
}

describe("payout after cancellation retains job earnings", () => {
	for (const scenario of [
		"reapproved",
		"submitted",
		"precision",
		"closed-period",
	] as const) {
		it(`pays ${scenario} jobs without reposting existing earnings`, async () => {
			const state = fixture({
				submitted: scenario === "submitted",
				precisionOnly: scenario === "precision",
				closedOriginalPeriod: scenario === "closed-period",
			});
			expect(await state.run()).toEqual({ id: 1, totalPayout: 6074.16 });
			expect(
				state.created.filter((entry) => entry.type === "JOB_EARNED"),
			).toHaveLength(0);
			expect(
				state.created.filter((entry) => entry.type === "PAYOUT"),
			).toHaveLength(1);
			expect(state.entries[0].effectiveAt).toEqual(earnedAt);
			expect(
				state.created
					.reduce(
						(sum, entry) => sum.plus(new Prisma.Decimal(entry.liabilityDelta)),
						state.entries.reduce(
							(sum, entry) => sum.plus(entry.liabilityDelta),
							new Prisma.Decimal(0),
						),
					)
					.toNumber(),
			).toBe(0);
			expect(state.committed()).toBe(true);
		});
	}
	for (const scenario of ["contractor", "amount"] as const) {
		it(`still rejects an existing earning with a changed ${scenario}`, async () => {
			const state = fixture({
				ledgerContractor: scenario === "contractor" ? 63 : 62,
				changedAmount: scenario === "amount",
			});
			await expect(state.run()).rejects.toThrow("different accounting values");
			expect(state.committed()).toBe(false);
		});
	}
	it("rolls back when another payout claims a selected job", async () => {
		const state = fixture({ claimedCount: 13 });
		await expect(state.run()).rejects.toThrow(
			"no longer available for payment",
		);
		expect(state.jobUpdates[0].where).toMatchObject({
			userId: 62,
			paymentId: null,
			deletedAt: null,
			NOT: [{ status: "Paid" }],
		});
		expect(state.committed()).toBe(false);
	});
});
