import { createHash } from "node:crypto";

export const EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION =
	"employee-document-private-storage/v1";

export function assertEmployeeDocumentMigrationStorageIsolation(input: {
	environment: "local" | "production";
	mode: "preview" | "apply" | "verify";
	token: string | undefined;
	productionToken: string | undefined;
}) {
	if (input.environment !== "local" || input.mode === "preview") return;
	if (!input.productionToken) {
		throw new Error("Cannot verify local private Blob token isolation.");
	}
	if (input.token && input.token === input.productionToken) {
		throw new Error(
			"Local migration refuses the Production private Blob token.",
		);
	}
}

export function assertEmployeeDocumentMigrationBlobStore(input: {
	token: string;
	confirmedStoreId: string | null;
}) {
	const tokenStoreId = /^vercel_blob_rw_([^_]+)_.+$/.exec(input.token)?.[1];
	if (!tokenStoreId || input.confirmedStoreId !== `store_${tokenStoreId}`) {
		throw new Error("Private Blob token does not match --confirm-store-id.");
	}
}

export function employeeDocumentMigrationUploadOptions(input: {
	token: string;
	contentType: string;
}) {
	return {
		access: "private" as const,
		token: input.token,
		contentType: input.contentType,
		addRandomSuffix: true,
		allowOverwrite: false,
	};
}

export function digestEmployeeDocumentMigration(value: unknown) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function employeeDocumentDatabaseTarget(
	databaseUrl: string,
	environment: string,
) {
	const url = new URL(databaseUrl);
	if (url.protocol !== "mysql:") throw new Error("A MySQL target is required.");
	if (!["local", "production"].includes(environment)) {
		throw new Error("Choose local or production.");
	}
	const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
	if (environment === "local" && !isLocal) {
		throw new Error("Local mode refuses a hosted database.");
	}
	if (environment === "production" && isLocal) {
		throw new Error("Production mode refuses a local database.");
	}
	const identity = `${url.hostname}:${url.port || "3306"}${url.pathname}`;
	return {
		environment: environment as "local" | "production",
		identity,
		fingerprint: digestEmployeeDocumentMigration(identity),
	};
}

export function employeeDocumentSourceHash(input: {
	id: number;
	userId: number;
	url: string;
	meta: unknown;
	updatedAt: Date | string | null;
}) {
	return digestEmployeeDocumentMigration({
		id: input.id,
		userId: input.userId,
		url: input.url,
		meta: input.meta,
		updatedAt: input.updatedAt ? new Date(input.updatedAt).toISOString() : null,
	});
}
