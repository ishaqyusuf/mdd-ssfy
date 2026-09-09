import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Database } from "../index";

type Checkpoint = {
	windowStart: string;
	windowEnd: string;
	cursor: string | null;
	page: number;
};
function checkpoint(value: Prisma.JsonValue): Checkpoint {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("Invalid reliability checkpoint");
	const data = value as Partial<Checkpoint>;
	if (
		typeof data.windowStart !== "string" ||
		typeof data.windowEnd !== "string" ||
		!Number.isFinite(Date.parse(data.windowStart)) ||
		!Number.isFinite(Date.parse(data.windowEnd)) ||
		!(data.cursor === null || typeof data.cursor === "string") ||
		typeof data.page !== "number" ||
		!Number.isSafeInteger(data.page) ||
		data.page < 0
	)
		throw new Error("Invalid reliability checkpoint");
	return {
		windowStart: data.windowStart,
		windowEnd: data.windowEnd,
		cursor: data.cursor,
		page: data.page,
	};
}
function validate(id: string, now: Date) {
	if (!/^[a-f0-9]{64}$/.test(id) || !Number.isFinite(now.getTime()))
		throw new Error("Invalid reliability cursor request");
}

export async function deferReliabilityCursor(
	db: Database,
	input: {
		id: string;
		leaseId: string;
		now: Date;
		retryAt: Date;
		errorCode: string;
	},
) {
	validate(input.id, input.now);
	if (
		!/^[A-Z0-9_]{1,80}$/.test(input.errorCode) ||
		!Number.isFinite(input.retryAt.getTime()) ||
		input.retryAt <= input.now ||
		input.retryAt.getTime() - input.now.getTime() > 86_400_000
	)
		throw new Error("Invalid reliability cursor cooldown");
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM ReliabilityCursor WHERE id = ${input.id} FOR UPDATE`;
			const saved = await tx.reliabilityCursor.findUnique({
				where: { id: input.id },
			});
			if (
				!saved ||
				saved.leaseId !== input.leaseId ||
				!saved.leaseExpiresAt ||
				saved.leaseExpiresAt <= input.now
			)
				return false;
			await tx.reliabilityCursor.update({
				where: { id: input.id },
				data: {
					lastErrorCode: input.errorCode,
					leaseId: randomUUID(),
					leaseExpiresAt: input.retryAt,
				},
			});
			return true;
		},
		{ timeout: 10_000 },
	);
}

export async function claimReliabilityCursor(
	db: Database,
	input: {
		id: string;
		now: Date;
		leaseMs: number;
		initialWindowStart: Date;
		overlapMs: number;
		replayWindow?: boolean;
	},
) {
	validate(input.id, input.now);
	if (
		!Number.isInteger(input.leaseMs) ||
		input.leaseMs < 1000 ||
		input.leaseMs > 300_000 ||
		!Number.isInteger(input.overlapMs) ||
		input.overlapMs < 0 ||
		input.overlapMs > 86_400_000 ||
		!Number.isFinite(input.initialWindowStart.getTime()) ||
		input.initialWindowStart >= input.now
	)
		throw new Error("Invalid reliability discovery window");
	await db.reliabilityCursor.createMany({
		data: [{ id: input.id }],
		skipDuplicates: true,
	});
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM ReliabilityCursor WHERE id = ${input.id} FOR UPDATE`;
			const saved = await tx.reliabilityCursor.findUniqueOrThrow({
				where: { id: input.id },
			});
			if (
				saved.leaseId &&
				saved.leaseExpiresAt &&
				saved.leaseExpiresAt > input.now
			)
				return null;
			const leaseId = randomUUID();
			if (saved.watermark && saved.watermark > input.now)
				throw new Error("Reliability cursor clock moved backwards");
			const next = saved.checkpoint
				? checkpoint(saved.checkpoint)
				: {
						windowStart:
							saved.watermark && !input.replayWindow
								? new Date(
										saved.watermark.getTime() - input.overlapMs,
									).toISOString()
								: input.initialWindowStart.toISOString(),
						windowEnd: input.now.toISOString(),
						cursor: null,
						page: 0,
					};
			const updated = await tx.reliabilityCursor.update({
				where: { id: input.id },
				data: {
					checkpoint: next,
					leaseId,
					leaseExpiresAt: new Date(input.now.getTime() + input.leaseMs),
				},
			});
			return { ...updated, checkpoint: next };
		},
		{ timeout: 10_000 },
	);
}

/** Call only after every occurrence in this provider page has committed. */
export async function recordReliabilityCursorPage(
	db: Database,
	input: {
		id: string;
		leaseId: string;
		now: Date;
		expectedPage: number;
		nextCursor: string | null;
	},
) {
	validate(input.id, input.now);
	if (
		!Number.isSafeInteger(input.expectedPage) ||
		input.expectedPage < 0 ||
		!(
			input.nextCursor === null ||
			(typeof input.nextCursor === "string" &&
				input.nextCursor.length > 0 &&
				input.nextCursor.length <= 2048)
		)
	)
		throw new Error("Invalid reliability page receipt");
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM ReliabilityCursor WHERE id = ${input.id} FOR UPDATE`;
			const saved = await tx.reliabilityCursor.findUnique({
				where: { id: input.id },
			});
			if (
				!saved ||
				saved.leaseId !== input.leaseId ||
				!saved.leaseExpiresAt ||
				saved.leaseExpiresAt <= input.now ||
				!saved.checkpoint
			)
				return false;
			const current = checkpoint(saved.checkpoint);
			if (current.page !== input.expectedPage) return false;
			if (input.nextCursor !== null && input.nextCursor === current.cursor)
				throw new Error("Reliability pagination did not advance");
			await tx.reliabilityCursor.update({
				where: { id: input.id },
				data:
					input.nextCursor === null
						? {
								watermark: new Date(current.windowEnd),
								checkpoint: Prisma.DbNull,
								lastSuccessAt: input.now,
								lastErrorCode: null,
								leaseId: null,
								leaseExpiresAt: null,
							}
						: {
								checkpoint: {
									...current,
									cursor: input.nextCursor,
									page: current.page + 1,
								},
							},
			});
			return true;
		},
		{ timeout: 10_000 },
	);
}
