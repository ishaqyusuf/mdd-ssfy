import { describe, expect, spyOn, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { deleteUserDocument, saveUserDocument } from "./user";

describe("saveUserDocument canonical ownership", () => {
	test("scopes updates to the owner and stores only the authenticated route", async () => {
		let updateInput: unknown;
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirst: async () => ({ id: 7 }),
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
						provider: "vercel-blob",
						visibility: "private",
						meta: {
							workflow: "employee_document",
							storageAccess: "private",
						},
					}),
				},
				userDocuments: {
					findFirstOrThrow: async () => ({
						id: 91,
						meta: { storedDocumentId: "stored-1" },
					}),
					update: async (input: unknown) => {
						updateInput = input;
						return {
							id: 91,
							title: "Certification",
							url: "/api/employee-documents/91",
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
		});

		expect(updateInput).toMatchObject({
			where: {
				id: 91,
				userId: 7,
				deletedAt: null,
			},
			data: {
				url: "/api/employee-documents/91",
				meta: { storedDocumentId: "stored-1" },
			},
		});
	});

	test("rejects a new business row backed only by an arbitrary URL", async () => {
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirst: async () => ({ id: 7 }),
					findFirstOrThrow: async () => ({
						id: 7,
						email: "employee@example.com",
						name: "Employee",
						phoneNo: null,
						roles: [],
					}),
				},
			},
		} as unknown as TRPCContext;

		expect(
			saveUserDocument(ctx, {
				title: "Insurance",
				url: "https://attacker.example/unrelated.pdf",
			}),
		).rejects.toThrow("Upload the document file before saving its details.");
	});

	test("rejects metadata edits that attempt to swap the canonical file", async () => {
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirst: async () => ({ id: 7 }),
					findFirstOrThrow: async () => ({
						id: 7,
						email: "employee@example.com",
						name: "Employee",
						phoneNo: null,
						roles: [],
					}),
				},
				userDocuments: {
					findFirstOrThrow: async () => ({
						id: 91,
						meta: { storedDocumentId: "stored-1" },
					}),
				},
			},
		} as unknown as TRPCContext;

		expect(
			saveUserDocument(ctx, {
				id: 91,
				title: "Insurance",
				storedDocumentId: "stored-2",
			}),
		).rejects.toThrow("file replacement is not supported");
	});

	test("keeps a committed employee document when review notification fails", async () => {
		let created = false;
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirst: async () => ({ id: 7 }),
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
						provider: "vercel-blob",
						visibility: "private",
						meta: {
							workflow: "employee_document",
							storageAccess: "private",
						},
					}),
				},
				$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
					callback({
						userDocuments: {
							create: async () => {
								created = true;
								return { id: 92 };
							},
							update: async () => ({
								id: 92,
								title: "Insurance",
								description: null,
								url: "/api/employee-documents/92",
								meta: {
									status: "pending",
									storedDocumentId: "stored-2",
								},
							}),
						},
					}),
			},
		} as unknown as TRPCContext;

		const consoleError = spyOn(console, "error").mockImplementation(() => {});
		const result = await saveUserDocument(ctx, {
			title: "Insurance",
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

describe("deleteUserDocument private cleanup", () => {
	function deletionFixture(events: string[]) {
		return {
			userId: 7,
			db: {
				users: { findFirst: async () => ({ id: 7 }) },
				userDocuments: {
					findFirstOrThrow: async () => ({
						meta: { storedDocumentId: "stored-1" },
					}),
				},
				storedDocument: {
					findFirst: async () => ({
						id: "stored-1",
						pathname: "employee-documents/7/91/document.pdf",
						provider: "vercel-blob",
						visibility: "private",
						meta: {
							workflow: "employee_document",
							storageAccess: "private",
						},
					}),
					update: async (input: unknown) => {
						events.push("cleanup-retry-recorded");
						return input;
					},
				},
				$transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
					events.push("transaction-started");
					const result = await callback({
						userDocuments: {
							update: async () => {
								events.push("business-access-revoked");
							},
						},
						storedDocument: {
							updateMany: async (input: unknown) => {
								events.push("canonical-access-revoked");
								expect(input).toMatchObject({
									where: {
										id: "stored-1",
										ownerType: "user",
										ownerId: "7",
										kind: "attachment",
										deletedAt: null,
									},
									data: {
										status: "deleted",
										isCurrent: false,
									},
								});
								return { count: 1 };
							},
						},
					});
					events.push("transaction-committed");
					return result;
				},
			},
		} as unknown as TRPCContext;
	}

	test("revokes both records before deleting the private object", async () => {
		const events: string[] = [];
		const result = await deleteUserDocument(
			deletionFixture(events),
			91,
			async (pathname) => {
				expect(pathname).toBe("employee-documents/7/91/document.pdf");
				events.push("provider-object-deleted");
			},
		);

		expect(result).toEqual({ success: true, cleanupPending: false });
		expect(events).toEqual([
			"transaction-started",
			"business-access-revoked",
			"canonical-access-revoked",
			"transaction-committed",
			"provider-object-deleted",
		]);
	});

	test("keeps access revoked and records retry when provider cleanup fails", async () => {
		const events: string[] = [];
		const result = await deleteUserDocument(
			deletionFixture(events),
			91,
			async () => {
				events.push("provider-delete-failed");
				throw new Error("provider unavailable");
			},
		);

		expect(result).toEqual({ success: true, cleanupPending: true });
		expect(events).toEqual([
			"transaction-started",
			"business-access-revoked",
			"canonical-access-revoked",
			"transaction-committed",
			"provider-delete-failed",
			"cleanup-retry-recorded",
		]);
	});
});
