import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_STAGED_MAX_FILES_PER_ACTOR,
	cleanupAssistantStagedUploadFailure,
	reserveAssistantStagedUpload,
} from "./storage.route";

describe("assistant staged upload quota", () => {
	test("reserves capacity serially so concurrent uploads cannot exceed the cap", async () => {
		const reservations: Array<{ id: string; size: number }> = [];
		const isolationLevels: string[] = [];
		let lock = Promise.resolve();
		const tx = {
			storedDocument: {
				count: async () => reservations.length,
				aggregate: async () => ({
					_sum: {
						size: reservations.reduce((sum, item) => sum + item.size, 0),
					},
				}),
				create: async ({ data }: { data: { size: number } }) => {
					const record = {
						id: `reservation-${reservations.length + 1}`,
						size: data.size,
					};
					reservations.push(record);
					return record;
				},
			},
		};
		const db = {
			$transaction: async (
				operation: (transaction: typeof tx) => Promise<unknown>,
				options: { isolationLevel: string },
			) => {
				isolationLevels.push(options.isolationLevel);
				const previous = lock;
				let release = () => undefined;
				lock = new Promise<void>((resolve) => {
					release = resolve;
				});
				await previous;
				try {
					return await operation(tx);
				} finally {
					release();
				}
			},
		};

		const results = await Promise.allSettled(
			Array.from({ length: ASSISTANT_STAGED_MAX_FILES_PER_ACTOR + 1 }, () =>
				reserveAssistantStagedUpload(db as never, {
					userId: 42,
					filename: "request.pdf",
					contentType: "application/pdf",
					size: 1_000,
					pathname: `user/42/attachment/${crypto.randomUUID()}.pdf`,
				}),
			),
		);

		expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
			ASSISTANT_STAGED_MAX_FILES_PER_ACTOR,
		);
		expect(results.filter(({ status }) => status === "rejected")).toHaveLength(
			1,
		);
		expect(isolationLevels.every((level) => level === "Serializable")).toBe(
			true,
		);
	});

	test("deletes the deterministic pathname before tombstoning a failed upload", async () => {
		const events: string[] = [];
		const db = {
			storedDocument: {
				updateMany: async () => {
					events.push("tombstone");
					return { count: 1 };
				},
			},
		};

		await cleanupAssistantStagedUploadFailure(
			db as never,
			{
				reservationId: "reservation-1",
				pathname: "user/42/attachment/deterministic.pdf",
			},
			async (pathname) => {
				events.push(`delete:${pathname}`);
			},
		);

		expect(events).toEqual([
			"delete:user/42/attachment/deterministic.pdf",
			"tombstone",
		]);
	});

	test("keeps the reservation recoverable when blob deletion fails", async () => {
		let tombstoned = false;
		const db = {
			storedDocument: {
				updateMany: async () => {
					tombstoned = true;
					return { count: 1 };
				},
			},
		};

		await expect(
			cleanupAssistantStagedUploadFailure(
				db as never,
				{
					reservationId: "reservation-1",
					pathname: "user/42/attachment/deterministic.pdf",
				},
				async () => {
					throw new Error("delete unavailable");
				},
			),
		).rejects.toThrow("delete unavailable");
		expect(tombstoned).toBe(false);
	});
});
