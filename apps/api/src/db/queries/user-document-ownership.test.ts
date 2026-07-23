import { describe, expect, spyOn, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { saveUserDocument } from "./user";

describe("saveUserDocument canonical ownership", () => {
	test("scopes updates to the target user and derives the compatibility URL", async () => {
		let updateInput: unknown;
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirstOrThrow: async () => ({
						id: 7,
						email: "employee@example.com",
						name: "Employee",
						phoneNo: null,
						roles: [],
					}),
				},
				storedDocument: {
					findFirst: async () => ({
						id: "stored-1",
						url: "https://blob.example/canonical.pdf",
						pathname: "user/7/attachment/canonical.pdf",
					}),
				},
				userDocuments: {
					update: async (input: unknown) => {
						updateInput = input;
						return {
							id: 91,
							title: "Certification",
							url: "https://blob.example/canonical.pdf",
							meta: { storedDocumentId: "stored-1" },
						};
					},
				},
			},
		} as unknown as TRPCContext;

		await saveUserDocument(ctx, {
			id: 91,
			title: "Certification",
			url: "https://attacker.example/unrelated.pdf",
			storedDocumentId: "stored-1",
		});

		expect(updateInput).toMatchObject({
			where: {
				id: 91,
				userId: 7,
				deletedAt: null,
			},
			data: {
				url: "https://blob.example/canonical.pdf",
				meta: { storedDocumentId: "stored-1" },
			},
		});
	});

	test("keeps a committed employee document when review notification fails", async () => {
		let created = false;
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirstOrThrow: async () => ({
						id: 7,
						email: "employee@example.com",
						name: "Employee",
						phoneNo: null,
						roles: [],
					}),
				},
				storedDocument: {
					findFirst: async () => ({
						id: "stored-2",
						url: "https://blob.example/insurance.pdf",
						pathname: "user/7/attachment/insurance.pdf",
					}),
				},
				userDocuments: {
					create: async () => {
						created = true;
						return {
							id: 92,
							title: "Insurance",
							description: null,
							url: "https://blob.example/insurance.pdf",
							meta: {
								status: "pending",
								storedDocumentId: "stored-2",
							},
						};
					},
				},
			},
		} as unknown as TRPCContext;

		const consoleError = spyOn(console, "error").mockImplementation(() => {});
		const result = await saveUserDocument(ctx, {
			title: "Insurance",
			url: "https://blob.example/insurance.pdf",
			storedDocumentId: "stored-2",
		});
		consoleError.mockRestore();

		expect(created).toBe(true);
		expect(result).toMatchObject({
			id: 92,
			notificationQueued: false,
		});
	});
});
