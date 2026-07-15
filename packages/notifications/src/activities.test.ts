// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { updateActivityStatus, updateAllActivitiesStatus } from "./activities";

function createDb() {
	const calls: unknown[] = [];
	const db = {
		noteRecipients: {
			updateMany: (input: unknown) => {
				calls.push(input);
				return Promise.resolve({ count: 1 });
			},
		},
	};

	return { db, calls };
}

describe("notification activity status helpers", () => {
	test("updates only the current recipient's activity receipt", async () => {
		const { db, calls } = createDb();

		await updateActivityStatus(db as never, 42, "archived", 7);

		expect(calls).toEqual([
			{
				where: {
					notePadId: 42,
					notePadContactId: 7,
					deletedAt: null,
				},
				data: {
					status: "archived",
				},
			},
		]);
	});

	test("bulk updates only matching current-recipient statuses", async () => {
		const { db, calls } = createDb();

		await updateAllActivitiesStatus(db as never, {
			notePadContactId: 7,
			status: "read",
			fromStatus: ["unread"],
		});

		expect(calls).toEqual([
			{
				where: {
					notePadContactId: 7,
					deletedAt: null,
					status: {
						in: ["unread"],
					},
				},
				data: {
					status: "read",
				},
			},
		]);
	});
});
