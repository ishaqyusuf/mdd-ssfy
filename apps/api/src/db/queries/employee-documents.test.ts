import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { resolveEmployeeDocumentAccess } from "./employee-documents";

function dbFixture(input?: {
	employeeId?: number;
	employeeAccessRevokedAt?: Date | null;
	meta?: unknown;
	storedOwnerId?: string;
	url?: string;
	storedDocumentId?: string | null;
}) {
	const employeeId = input?.employeeId ?? 7;
	const storedDocumentId =
		input && "storedDocumentId" in input ? input.storedDocumentId : "stored-1";
	return {
		userDocuments: {
			findFirst: async () => ({
				id: 42,
				userId: employeeId,
				title: "Insurance",
				url:
					input?.url ||
					"https://store.public.blob.vercel-storage.com/legacy.pdf",
				meta:
					input && "meta" in input
						? input.meta
						: storedDocumentId
							? { storedDocumentId }
							: null,
				user: {
					id: employeeId,
					deletedAt: null,
					accessRevokedAt: input?.employeeAccessRevokedAt ?? null,
				},
			}),
		},
		storedDocument: {
			findFirst: async (query: {
				where: { ownerId: string };
			}) => {
				if (
					(input?.storedOwnerId ?? String(employeeId)) !== query.where.ownerId
				) {
					return null;
				}
				return {
					id: storedDocumentId,
					provider: "vercel-blob",
					pathname: "user/7/attachment/insurance.pdf",
					url: null,
					filename: "insurance.pdf",
					mimeType: "application/pdf",
					visibility: "private",
					meta: {
						workflow: "employee_document",
						storageAccess: "private",
					},
				};
			},
		},
	} as unknown as Db;
}

describe("employee document record access", () => {
	test("allows the active employee owner", async () => {
		const result = await resolveEmployeeDocumentAccess(dbFixture(), {
			documentId: 42,
			actor: { id: 7 },
		});
		expect(result).toMatchObject({
			access: "private",
			recordId: 42,
			pathname: "user/7/attachment/insurance.pdf",
		});
	});

	test("allows explicit view permission and denies unrelated employees", async () => {
		expect(
			await resolveEmployeeDocumentAccess(dbFixture(), {
				documentId: 42,
				actor: { id: 8, canViewEmployeeDocument: true },
			}),
		).toMatchObject({ access: "private" });
		expect(
			await resolveEmployeeDocumentAccess(dbFixture(), {
				documentId: 42,
				actor: { id: 8 },
			}),
		).toBeNull();
	});

	test("denies access when the employee account has been revoked", async () => {
		expect(
			await resolveEmployeeDocumentAccess(
				dbFixture({ employeeAccessRevokedAt: new Date("2026-09-22") }),
				{
					documentId: 42,
					actor: { id: 7 },
				},
			),
		).toBeNull();
	});

	test("fails closed when the stored owner does not match the business owner", async () => {
		expect(
			await resolveEmployeeDocumentAccess(dbFixture({ storedOwnerId: "99" }), {
				documentId: 42,
				actor: { id: 7 },
			}),
		).toBeNull();
	});

	test("proxies only allowlisted legacy records during migration", async () => {
		const result = await resolveEmployeeDocumentAccess(
			dbFixture({ storedDocumentId: null }),
			{ documentId: 42, actor: { id: 7 } },
		);
		expect(result).toMatchObject({ access: "legacy" });
		expect(
			await resolveEmployeeDocumentAccess(
				dbFixture({
					storedDocumentId: null,
					url: "https://evil.example/a.pdf",
				}),
				{ documentId: 42, actor: { id: 7 } },
			),
		).toBeNull();
	});

	test("proxies a path-linked trusted legacy metadata URL", async () => {
		const url = "contractor-document/employee-proof";
		expect(
			await resolveEmployeeDocumentAccess(
				dbFixture({
					storedDocumentId: null,
					url,
					meta: {
						url: "https://res.cloudinary.com/demo/image/upload/v1/contractor-document/employee-proof.pdf",
					},
				}),
				{ documentId: 42, actor: { id: 7 } },
			),
		).toMatchObject({ access: "legacy" });
		expect(
			await resolveEmployeeDocumentAccess(
				dbFixture({
					storedDocumentId: null,
					url,
					meta: {
						url: "https://res.cloudinary.com/demo/image/upload/v1/contractor-document/employee-proof-copy.pdf",
					},
				}),
				{ documentId: 42, actor: { id: 7 } },
			),
		).toBeNull();
	});
});
