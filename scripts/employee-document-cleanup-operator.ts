import { randomUUID } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import type { Database, Prisma, TransactionClient } from "@gnd/db";
import {
	createEmployeeCleanupClaimMeta,
	finishEmployeeCleanupMeta,
	inspectPrivateEmployeeCleanup,
} from "@gnd/documents";
import { BlobNotFoundError, del, head } from "@vercel/blob";
import { parse } from "dotenv";
import { z } from "zod";
import {
	assertEmployeeDocumentMigrationBlobStore,
	assertEmployeeDocumentMigrationStorageIsolation,
	employeeDocumentDatabaseTarget,
} from "./employee-document-private-migration-policy";

const PRODUCTION_PRIVATE_STORE_ID = "store_hwG94qb1mozFw1qD";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const inventorySchema = z.object({
	contract: z.literal("employee-document-cleanup-inventory/v1"),
	target: z.object({
		environment: z.enum(["local", "production"]),
		identity: z.string(),
		fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
	}),
	candidates: z.array(z.string().min(1)),
	held: z.array(z.object({ storedDocumentId: z.string(), reason: z.string() })),
});

export function assertEmployeeCleanupStoreSelection(
	environment: "local" | "production",
	confirmedStoreId: string,
) {
	if (
		(environment === "production" &&
			confirmedStoreId !== PRODUCTION_PRIVATE_STORE_ID) ||
		(environment === "local" &&
			confirmedStoreId === PRODUCTION_PRIVATE_STORE_ID)
	) {
		throw new Error(
			"The confirmed private Blob store is not valid for this environment.",
		);
	}
}

export function assertEmployeeCleanupInventoryManifest(input: {
	manifest: unknown;
	target: ReturnType<typeof employeeDocumentDatabaseTarget>;
	documentId: string;
}) {
	const manifest = inventorySchema.parse(input.manifest);
	if (
		manifest.target.environment !== input.target.environment ||
		manifest.target.identity !== input.target.identity ||
		manifest.target.fingerprint !== input.target.fingerprint ||
		!manifest.candidates.includes(input.documentId) ||
		manifest.held.some((item) => item.storedDocumentId === input.documentId)
	) {
		throw new Error(
			"The inventory does not include this exact target and document ID.",
		);
	}
	return manifest;
}

type DbClient = Database | TransactionClient;
type BlobLookup = { pathname: string; etag: string } | null;

export type EmployeeCleanupProvider = {
	lookup(pathname: string): Promise<BlobLookup>;
	remove(pathname: string, etag: string): Promise<void>;
};

export function parseEmployeeCleanupOperatorArguments(argv: string[]) {
	const values: Record<string, string> = {};
	const allowed = new Set([
		"--environment",
		"--mode",
		"--manifest",
		"--document-id",
		"--confirm-target",
		"--confirm-store-id",
		"--token-source",
		"--output",
	]);
	for (let index = 0; index < argv.length; index += 2) {
		const key = argv[index];
		const value = argv[index + 1];
		if (
			!key ||
			!allowed.has(key) ||
			!value ||
			value.startsWith("--") ||
			values[key]
		) {
			throw new Error(`Invalid argument: ${key || "<missing>"}`);
		}
		values[key] = value;
	}
	const environment = values["--environment"];
	if (environment !== "local" && environment !== "production") {
		throw new Error("Explicit --environment local|production is required.");
	}
	if (values["--mode"] !== "apply") {
		throw new Error("Only explicit --mode apply is supported.");
	}
	const documentId = values["--document-id"];
	if (!documentId || !/^[a-zA-Z0-9_-]{1,191}$/.test(documentId)) {
		throw new Error("An exact canonical --document-id is required.");
	}
	const tokenSource = values["--token-source"];
	if (
		(environment === "local" && tokenSource !== "rehearsal-env") ||
		(environment === "production" && tokenSource !== "production-profile")
	) {
		throw new Error("The token source must match the explicit environment.");
	}
	for (const key of [
		"--manifest",
		"--output",
		"--confirm-target",
		"--confirm-store-id",
	]) {
		if (!values[key]) throw new Error(`${key} is required.`);
	}
	const manifest = resolve(values["--manifest"] as string);
	const output = resolve(values["--output"] as string);
	if (manifest === output) throw new Error("Manifest and output must differ.");
	return {
		environment: environment as "local" | "production",
		documentId,
		tokenSource,
		manifest,
		output,
		confirmTarget: values["--confirm-target"] as string,
		confirmStoreId: values["--confirm-store-id"] as string,
	};
}

async function readCandidate(
	client: DbClient,
	documentId: string,
	now: Date,
	allowClaimId?: string,
) {
	const stored = await client.storedDocument.findFirst({
		where: { id: documentId, deletedAt: { not: null } },
		select: {
			id: true,
			ownerType: true,
			ownerId: true,
			kind: true,
			provider: true,
			visibility: true,
			status: true,
			isCurrent: true,
			deletedAt: true,
			pathname: true,
			meta: true,
		},
	});
	if (!stored) {
		return { ok: false as const, reason: "missing_record" as const };
	}
	const deletedLinks = await client.userDocuments.findMany({
		where: {
			meta: { path: "$.storedDocumentId", equals: stored.id },
			deletedAt: { not: null },
		},
		select: { id: true, userId: true, deletedAt: true, meta: true },
		take: 2,
	});
	const liveLinks = await client.userDocuments.findMany({
		where: {
			meta: { path: "$.storedDocumentId", equals: stored.id },
			deletedAt: null,
		},
		select: { id: true, userId: true, deletedAt: true, meta: true },
		take: 1,
	});
	const inspection = inspectPrivateEmployeeCleanup({
		stored,
		deletedLinks,
		liveLinks,
		now,
		allowClaimId,
	});
	if (!inspection.ok) return inspection;
	return {
		ok: true as const,
		stored,
		meta: inspection.meta,
		attempts: inspection.attempts,
		pathname: inspection.pathname,
	};
}

async function finishClaim(input: {
	db: Database;
	documentId: string;
	claimMeta: Record<string, unknown>;
	completed: boolean;
	now: Date;
}) {
	const result = await input.db.storedDocument.updateMany({
		where: {
			id: input.documentId,
			status: "deleted",
			isCurrent: false,
			deletedAt: { not: null },
			meta: { equals: input.claimMeta as Prisma.InputJsonValue },
		},
		data: {
			meta: finishEmployeeCleanupMeta({
				meta: input.claimMeta,
				completed: input.completed,
				now: input.now,
			}),
		},
	});
	return result.count === 1;
}

export async function reconcileOnePrivateEmployeeDocument(input: {
	db: Database;
	documentId: string;
	provider: EmployeeCleanupProvider;
	now?: () => Date;
	claimId?: string;
}) {
	const now = input.now ?? (() => new Date());
	const claimId = input.claimId ?? randomUUID();
	const claim = await input.db.$transaction(async (tx) => {
		const inspected = await readCandidate(tx, input.documentId, now());
		if (!inspected.ok)
			return { status: "held" as const, reason: inspected.reason };
		const claimMeta = createEmployeeCleanupClaimMeta({
			meta: inspected.meta,
			claimId,
			attempts: inspected.attempts,
			now: now(),
		});
		const updated = await tx.storedDocument.updateMany({
			where: {
				id: input.documentId,
				ownerType: "user",
				ownerId: inspected.stored.ownerId,
				kind: "attachment",
				provider: "vercel-blob",
				visibility: "private",
				status: "deleted",
				isCurrent: false,
				deletedAt: { not: null },
				pathname: inspected.pathname,
				meta: { equals: inspected.meta as Prisma.InputJsonValue },
			},
			data: { meta: claimMeta },
		});
		return updated.count === 1
			? { status: "claimed" as const, pathname: inspected.pathname, claimMeta }
			: { status: "conflict" as const };
	});
	if (claim.status !== "claimed") return claim;

	const release = async () => {
		try {
			await finishClaim({
				db: input.db,
				documentId: input.documentId,
				claimMeta: claim.claimMeta,
				completed: false,
				now: now(),
			});
		} catch {
			// The bounded lease retains a durable retry state if this write fails.
		}
	};

	try {
		const rechecked = await readCandidate(
			input.db,
			input.documentId,
			now(),
			claimId,
		);
		if (
			!rechecked.ok ||
			rechecked.pathname !== claim.pathname ||
			!isDeepStrictEqual(rechecked.meta, claim.claimMeta)
		) {
			await release();
			return {
				status: "held" as const,
				reason: "changed_after_claim" as const,
			};
		}
		const existing = await input.provider.lookup(claim.pathname);
		if (existing) {
			if (existing.pathname !== claim.pathname || !existing.etag) {
				await release();
				return {
					status: "held" as const,
					reason: "provider_mismatch" as const,
				};
			}
			await input.provider.remove(claim.pathname, existing.etag);
			const remaining = await input.provider.lookup(claim.pathname);
			if (remaining) {
				await release();
				return { status: "pending" as const, reason: "still_present" as const };
			}
		}
		const completed = await finishClaim({
			db: input.db,
			documentId: input.documentId,
			claimMeta: claim.claimMeta,
			completed: true,
			now: now(),
		});
		return completed
			? { status: "completed" as const, removed: Boolean(existing) }
			: { status: "pending" as const, reason: "completion_conflict" as const };
	} catch {
		await release();
		return {
			status: "pending" as const,
			reason: "provider_or_database_error" as const,
		};
	}
}

async function loadProfile(environment: "local" | "production") {
	const profile = parse(
		await readFile(resolve(repositoryRoot, `.env.${environment}`), "utf8"),
	);
	if (!profile.DATABASE_URL) {
		throw new Error(`Selected ${environment} profile must own DATABASE_URL.`);
	}
	process.env.DATABASE_URL = profile.DATABASE_URL;
	return profile;
}

export async function runEmployeeDocumentCleanupOperator(argv: string[]) {
	const options = parseEmployeeCleanupOperatorArguments(argv);
	const launchRehearsalToken =
		process.env.REHEARSAL_BLOB_READ_WRITE_TOKEN?.trim();
	const profile = await loadProfile(options.environment);
	const target = employeeDocumentDatabaseTarget(
		profile.DATABASE_URL as string,
		options.environment,
	);
	process.stdout.write(`${JSON.stringify({ mode: "apply_one", target })}\n`);
	if (options.confirmTarget !== target.fingerprint) {
		throw new Error("--confirm-target does not match the selected database.");
	}
	const token =
		options.environment === "production"
			? profile.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim()
			: launchRehearsalToken;
	if (!token) throw new Error("The selected private Blob token is missing.");
	assertEmployeeCleanupStoreSelection(
		options.environment,
		options.confirmStoreId,
	);
	if (options.environment === "local") {
		const production = parse(
			await readFile(resolve(repositoryRoot, ".env.production"), "utf8"),
		);
		assertEmployeeDocumentMigrationStorageIsolation({
			environment: "local",
			mode: "apply",
			token,
			productionToken: production.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim(),
		});
	}
	assertEmployeeDocumentMigrationBlobStore({
		token,
		confirmedStoreId: options.confirmStoreId,
	});
	assertEmployeeCleanupInventoryManifest({
		manifest: JSON.parse(await readFile(options.manifest, "utf8")),
		target,
		documentId: options.documentId,
	});
	const journal = await open(options.output, "wx", 0o600);
	let db: Database | null = null;
	try {
		await journal.writeFile(
			`${JSON.stringify({ contract: "employee-document-cleanup-operator/v1", target, documentId: options.documentId, state: "started" })}\n`,
		);
		await journal.sync();
		({ db } = await import("@gnd/db"));
		const provider: EmployeeCleanupProvider = {
			async lookup(pathname) {
				try {
					const result = await head(pathname, { token });
					return { pathname: result.pathname, etag: result.etag };
				} catch (error) {
					if (error instanceof BlobNotFoundError) return null;
					throw error;
				}
			},
			remove: (pathname, etag) => del(pathname, { token, ifMatch: etag }),
		};
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: options.documentId,
			provider,
		});
		await journal.writeFile(
			`${JSON.stringify({ documentId: options.documentId, ...result })}\n`,
		);
		await journal.sync();
		process.stdout.write(
			`${JSON.stringify({ documentId: options.documentId, ...result })}\n`,
		);
		return result;
	} finally {
		await db?.$disconnect();
		await journal.close();
	}
}

if (import.meta.main) {
	runEmployeeDocumentCleanupOperator(process.argv.slice(2)).catch((error) => {
		process.stderr.write(
			`${JSON.stringify({ error: error instanceof Error ? error.name : "Unknown", code: error && typeof error === "object" && "code" in error ? String(error.code) : null })}\n`,
		);
		process.exitCode = 1;
	});
}
