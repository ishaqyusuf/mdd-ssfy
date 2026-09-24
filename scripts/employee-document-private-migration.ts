import { createHash, randomUUID } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import type { Database, TransactionClient } from "@gnd/db";
import {
	EMPLOYEE_DOCUMENT_KIND,
	EMPLOYEE_DOCUMENT_OWNER_TYPE,
	EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
	EMPLOYEE_DOCUMENT_WORKFLOW,
	classifyLegacyEmployeeDocumentSource,
	employeeDocumentAccessPath,
	isPrivateEmployeeDocumentMeta,
	parseEmployeeStoredDocumentId,
	trustedLegacyEmployeeDocumentUrlFromRecord,
} from "@gnd/documents";
import { parse } from "dotenv";
import { z } from "zod";
import {
	type SupportedDocumentMimeType,
	decodeValidatedDocumentBase64,
	supportedDocumentMimeTypes,
} from "../apps/api/src/utils/upload-validation";
import {
	EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION,
	assertEmployeeDocumentMigrationStorageIsolation,
	digestEmployeeDocumentMigration,
	employeeDocumentDatabaseTarget,
	employeeDocumentSourceHash,
} from "./employee-document-private-migration-policy";

const candidateSchema = z
	.object({
		documentId: z.number().int().positive(),
		userId: z.number().int().positive(),
		sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
	})
	.strict();

export const employeeDocumentMigrationManifestSchema = z
	.object({
		contract: z.literal(EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION),
		batchId: z.string().uuid(),
		createdAt: z.string().datetime(),
		target: z
			.object({
				environment: z.enum(["local", "production"]),
				identity: z.string(),
				fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
			})
			.strict(),
		candidates: z.array(candidateSchema),
		held: z.array(
			z
				.object({
					documentId: z.number().int().positive(),
					reason: z.string(),
				})
				.strict(),
		),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (
			new Set(value.candidates.map((item) => item.documentId)).size !==
			value.candidates.length
		) {
			ctx.addIssue({
				code: "custom",
				message: "Duplicate document candidates.",
			});
		}
	});

export function parseEmployeeDocumentMigrationArguments(argv: string[]) {
	const values: Record<string, string> = {};
	const allowed = new Set([
		"--environment",
		"--mode",
		"--output",
		"--manifest",
		"--confirm-target",
		"--document-id",
		"--limit",
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
	const environment = values["--environment"] || "local";
	const mode = values["--mode"] || "preview";
	if (!["local", "production"].includes(environment)) {
		throw new Error("Use --environment local|production.");
	}
	if (!["preview", "apply", "verify"].includes(mode)) {
		throw new Error("Use --mode preview|apply|verify.");
	}
	if (!values["--output"])
		throw new Error("--output is required (new file only).");
	if (mode !== "preview" && !values["--manifest"]) {
		throw new Error("Apply and verify require --manifest.");
	}
	if (
		values["--manifest"] &&
		resolve(values["--manifest"]) === resolve(values["--output"])
	) {
		throw new Error("Manifest and output must differ.");
	}
	for (const key of ["--document-id", "--limit"]) {
		if (values[key] && !/^[1-9]\d*$/.test(values[key])) {
			throw new Error(`${key} must be a positive integer.`);
		}
	}
	if (values["--document-id"] && mode !== "preview") {
		throw new Error("--document-id is a preview-only filter.");
	}
	return {
		environment: environment as "local" | "production",
		mode: mode as "preview" | "apply" | "verify",
		output: resolve(values["--output"]),
		manifest: values["--manifest"] ? resolve(values["--manifest"]) : null,
		confirmTarget: values["--confirm-target"] || null,
		documentId: values["--document-id"]
			? Number(values["--document-id"])
			: null,
		limit: values["--limit"] ? Number(values["--limit"]) : null,
	};
}

type DbClient = Database | TransactionClient;
type Source = Awaited<ReturnType<typeof readSource>>;

async function readSource(db: DbClient, documentId: number) {
	return db.userDocuments.findFirst({
		where: { id: documentId, deletedAt: null },
		select: {
			id: true,
			userId: true,
			title: true,
			url: true,
			meta: true,
			updatedAt: true,
		},
	});
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export async function resolveEmployeeDocumentMigrationSource(
	db: DbClient,
	source: NonNullable<Source>,
) {
	const storedDocumentId = parseEmployeeStoredDocumentId(source.meta);
	const storedDocument = storedDocumentId
		? await db.storedDocument.findFirst({
				where: {
					id: storedDocumentId,
					ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
					ownerId: String(source.userId),
					kind: EMPLOYEE_DOCUMENT_KIND,
					status: "ready",
					deletedAt: null,
				},
				select: {
					id: true,
					url: true,
					filename: true,
					mimeType: true,
					provider: true,
					visibility: true,
					meta: true,
					uploadedBy: true,
					checksum: true,
				},
			})
		: null;
	if (storedDocumentId && !storedDocument) {
		return {
			state: "held" as const,
			reason: "STORED_DOCUMENT_OWNERSHIP_OR_STATE_MISMATCH",
		};
	}
	if (
		storedDocument?.provider === "vercel-blob" &&
		storedDocument.visibility === EMPLOYEE_DOCUMENT_PRIVATE_ACCESS &&
		isPrivateEmployeeDocumentMeta(storedDocument.meta)
	) {
		return { state: "private" as const, storedDocument };
	}
	const storedDocumentSource = Boolean(storedDocument?.url);
	const classified = classifyLegacyEmployeeDocumentSource(
		storedDocumentSource ? storedDocument?.url : source.url,
	);
	if (
		classified.kind === "trusted_vercel_public_blob" ||
		classified.kind === "trusted_cloudinary"
	) {
		return { state: "legacy" as const, url: classified.url, storedDocument };
	}
	if (!storedDocumentSource) {
		const metadataSource = trustedLegacyEmployeeDocumentUrlFromRecord(source);
		if (metadataSource) {
			return {
				state: "legacy" as const,
				url: metadataSource,
				storedDocument,
			};
		}
	}
	const heldReason = {
		missing: "MISSING_SOURCE_URL",
		internal_application_route:
			"INTERNAL_APPLICATION_ROUTE_WITHOUT_PRIVATE_LINK",
		relative_path: "RELATIVE_SOURCE_PATH",
		bare_storage_reference: storedDocumentSource
			? "BARE_STORED_DOCUMENT_REFERENCE"
			: "BARE_USER_DOCUMENT_REFERENCE",
		unsupported_protocol: "UNSUPPORTED_SOURCE_PROTOCOL",
		untrusted_https_host: "UNTRUSTED_SOURCE_HOST",
		invalid_url: "INVALID_SOURCE_URL",
	}[classified.kind];
	return { state: "held" as const, reason: heldReason };
}

function sanitizeFilename(input: string | null | undefined, fallback: string) {
	const value = basename(input || fallback).replace(/[^a-zA-Z0-9._-]/g, "-");
	return value || fallback;
}

function extensionFor(contentType: string | null, url: string) {
	const fromUrl = extname(new URL(url).pathname).toLowerCase();
	if (/^\.[a-z0-9]{1,8}$/.test(fromUrl)) return fromUrl;
	return (
		{
			"application/pdf": ".pdf",
			"image/png": ".png",
			"image/jpeg": ".jpg",
			"image/webp": ".webp",
			"image/avif": ".avif",
			"image/heic": ".heic",
			"image/heif": ".heif",
		}[contentType || ""] || ".bin"
	);
}

async function loadProfile(environment: "local" | "production") {
	const root = resolve(import.meta.dir, "..");
	const selectedPath = resolve(root, `.env.${environment}`);
	const selected = parse(await readFile(selectedPath, "utf8"));
	if (!selected.DATABASE_URL) {
		throw new Error(`Selected ${environment} profile must own DATABASE_URL.`);
	}
	const base = parse(
		await readFile(resolve(root, ".env"), "utf8").catch(
			(error: NodeJS.ErrnoException) => {
				if (error.code === "ENOENT") return "";
				throw error;
			},
		),
	);
	Object.assign(process.env, base, selected, {
		DATABASE_URL: selected.DATABASE_URL,
	});
	return selected.DATABASE_URL;
}

export async function runEmployeeDocumentPrivateMigration(argv: string[]) {
	const options = parseEmployeeDocumentMigrationArguments(argv);
	const databaseUrl = await loadProfile(options.environment);
	const target = employeeDocumentDatabaseTarget(
		databaseUrl,
		options.environment,
	);
	process.stdout.write(`${JSON.stringify({ mode: options.mode, target })}\n`);
	if (
		options.mode !== "preview" &&
		options.confirmTarget !== target.fingerprint
	) {
		throw new Error(
			"Apply and verify require --confirm-target matching the printed fingerprint.",
		);
	}
	const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
	if (options.mode !== "preview" && !token) {
		throw new Error("PRIVATE_BLOB_READ_WRITE_TOKEN is required.");
	}
	if (options.environment === "local" && options.mode !== "preview") {
		const productionProfile = parse(
			await readFile(
				resolve(import.meta.dir, "..", ".env.production"),
				"utf8",
			).catch((error: NodeJS.ErrnoException) => {
				if (error.code === "ENOENT") return "";
				throw error;
			}),
		);
		assertEmployeeDocumentMigrationStorageIsolation({
			environment: options.environment,
			mode: options.mode,
			token,
			productionToken: productionProfile.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim(),
		});
	}
	const { db } = await import("@gnd/db");
	const output = await open(options.output, "wx", 0o600);
	let journalQueue = Promise.resolve();
	const append = (entry: unknown) => {
		journalQueue = journalQueue.then(async () => {
			await output.writeFile(`${JSON.stringify(entry)}\n`);
			await output.sync();
		});
		return journalQueue;
	};
	try {
		if (options.mode === "preview") {
			const manifest: z.infer<typeof employeeDocumentMigrationManifestSchema> =
				{
					contract: EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION,
					batchId: randomUUID(),
					createdAt: new Date().toISOString(),
					target,
					candidates: [],
					held: [],
				};
			let cursor = 0;
			while (!options.limit || manifest.candidates.length < options.limit) {
				const rows = await db.userDocuments.findMany({
					where: {
						id: options.documentId
							? { equals: options.documentId, gt: cursor }
							: { gt: cursor },
						deletedAt: null,
					},
					select: {
						id: true,
						userId: true,
						title: true,
						url: true,
						meta: true,
						updatedAt: true,
					},
					orderBy: { id: "asc" },
					take: 100,
				});
				if (!rows.length) break;
				for (const row of rows) {
					const resolved = await resolveEmployeeDocumentMigrationSource(
						db,
						row,
					);
					if (resolved.state === "private") continue;
					if (resolved.state === "held") {
						manifest.held.push({ documentId: row.id, reason: resolved.reason });
						continue;
					}
					manifest.candidates.push({
						documentId: row.id,
						userId: row.userId,
						sourceHash: employeeDocumentSourceHash(row),
					});
					if (options.limit && manifest.candidates.length >= options.limit)
						break;
				}
				const lastRow = rows.at(-1);
				if (!lastRow) break;
				cursor = lastRow.id;
				if (options.documentId) break;
			}
			employeeDocumentMigrationManifestSchema.parse(manifest);
			await output.writeFile(`${JSON.stringify(manifest, null, 2)}\n`);
			await output.sync();
			process.stdout.write(
				`${JSON.stringify({ candidates: manifest.candidates.length, held: manifest.held.length, manifestDigest: digestEmployeeDocumentMigration(manifest), output: options.output })}\n`,
			);
			return;
		}

		if (!options.manifest) throw new Error("Manifest path is required.");
		const manifest = employeeDocumentMigrationManifestSchema.parse(
			JSON.parse(await readFile(options.manifest, "utf8")),
		);
		if (
			digestEmployeeDocumentMigration(manifest.target) !==
			digestEmployeeDocumentMigration(target)
		) {
			throw new Error("Manifest database target mismatch.");
		}
		const manifestDigest = digestEmployeeDocumentMigration(manifest);
		await append({
			contract: EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION,
			mode: options.mode,
			batchId: manifest.batchId,
			target,
			manifestDigest,
			startedAt: new Date().toISOString(),
		});

		if (options.mode === "verify") {
			const { head } = await import("@vercel/blob");
			for (const candidate of manifest.candidates) {
				const source = await readSource(db, candidate.documentId);
				if (!source)
					throw new Error(`Document ${candidate.documentId} is missing.`);
				const storedDocumentId = parseEmployeeStoredDocumentId(source.meta);
				const stored = storedDocumentId
					? await db.storedDocument.findFirst({
							where: {
								id: storedDocumentId,
								ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
								ownerId: String(source.userId),
								kind: EMPLOYEE_DOCUMENT_KIND,
								status: "ready",
								deletedAt: null,
							},
							select: {
								pathname: true,
								provider: true,
								visibility: true,
								size: true,
								meta: true,
							},
						})
					: null;
				if (
					!stored ||
					stored.provider !== "vercel-blob" ||
					stored.visibility !== EMPLOYEE_DOCUMENT_PRIVATE_ACCESS ||
					!isPrivateEmployeeDocumentMeta(stored.meta) ||
					source.url !== employeeDocumentAccessPath(source.id)
				) {
					throw new Error(`Document ${source.id} is not privately linked.`);
				}
				const remote = await head(stored.pathname, { token });
				if (stored.size !== null && remote.size !== stored.size) {
					throw new Error(`Document ${source.id} private size mismatch.`);
				}
				await append({ documentId: source.id, status: "verified" });
			}
			return;
		}

		const { del, head, put } = await import("@vercel/blob");
		for (const candidate of manifest.candidates) {
			try {
				const source = await readSource(db, candidate.documentId);
				if (!source)
					throw new Error(`Document ${candidate.documentId} is missing.`);
				if (
					source.userId !== candidate.userId ||
					employeeDocumentSourceHash(source) !== candidate.sourceHash
				) {
					throw new Error(`Document ${source.id} changed after preview.`);
				}
				const resolved = await resolveEmployeeDocumentMigrationSource(
					db,
					source,
				);
				if (resolved.state === "private") {
					await append({ documentId: source.id, status: "already_private" });
					continue;
				}
				if (resolved.state !== "legacy") {
					throw new Error(
						`Document ${source.id} no longer has a trusted source.`,
					);
				}
				const existing = await db.storedDocument.findFirst({
					where: {
						ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
						ownerId: String(source.userId),
						kind: EMPLOYEE_DOCUMENT_KIND,
						sourceType: EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION,
						sourceId: String(source.id),
						provider: "vercel-blob",
						visibility: EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
						status: "ready",
						deletedAt: null,
					},
					select: { id: true, meta: true, pathname: true },
				});
				if (existing && isPrivateEmployeeDocumentMeta(existing.meta)) {
					const updated = await db.userDocuments.updateMany({
						where: {
							id: source.id,
							userId: source.userId,
							updatedAt: source.updatedAt,
							deletedAt: null,
						},
						data: {
							url: employeeDocumentAccessPath(source.id),
							meta: { ...asRecord(source.meta), storedDocumentId: existing.id },
						},
					});
					if (updated.count !== 1) {
						throw new Error(`Document ${source.id} changed during relink.`);
					}
					await append({ documentId: source.id, status: "relinked" });
					continue;
				}

				const response = await fetch(resolved.url, {
					cache: "no-store",
					redirect: "error",
				});
				if (!response.ok)
					throw new Error(`Document ${source.id} source fetch failed.`);
				const bytes = Buffer.from(await response.arrayBuffer());
				if (!bytes.length || bytes.length > 25_000_000) {
					throw new Error(`Document ${source.id} is empty or exceeds 25 MB.`);
				}
				const contentType =
					response.headers.get("content-type")?.split(";")[0]?.trim() || null;
				if (
					!contentType ||
					!supportedDocumentMimeTypes.includes(
						contentType as SupportedDocumentMimeType,
					)
				) {
					throw new Error(
						`Document ${source.id} has an unsupported file type.`,
					);
				}
				await decodeValidatedDocumentBase64({
					content: bytes.toString("base64"),
					contentType: contentType as SupportedDocumentMimeType,
					maxBytes: 25_000_000,
				});
				const checksum = createHash("sha256").update(bytes).digest("hex");
				if (
					resolved.storedDocument?.checksum &&
					resolved.storedDocument.checksum !== checksum
				) {
					throw new Error(`Document ${source.id} source checksum mismatch.`);
				}
				const extension = extensionFor(contentType, resolved.url);
				const filename = sanitizeFilename(
					resolved.storedDocument?.filename,
					`employee-document-${source.id}${extension}`,
				);
				const pathname = `employee-documents/${source.userId}/${source.id}/${candidate.sourceHash.slice(0, 16)}-${filename}`;
				const uploaded = await put(pathname, bytes, {
					access: "private",
					token,
					contentType: contentType || undefined,
					addRandomSuffix: false,
					allowOverwrite: true,
				});
				try {
					const remote = await head(uploaded.pathname, { token });
					if (remote.size !== bytes.length) {
						throw new Error(
							`Document ${source.id} private upload size mismatch.`,
						);
					}
					await db.$transaction(async (tx) => {
						const registered = await tx.storedDocument.create({
							data: {
								ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
								ownerId: String(source.userId),
								kind: EMPLOYEE_DOCUMENT_KIND,
								provider: "vercel-blob",
								pathname: uploaded.pathname,
								url: null,
								filename,
								mimeType: contentType,
								extension: extension.slice(1),
								size: bytes.length,
								checksum,
								visibility: EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
								status: "ready",
								isCurrent: false,
								sourceType: EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION,
								sourceId: String(source.id),
								uploadedBy: resolved.storedDocument?.uploadedBy ?? null,
								title: source.title,
								meta: {
									workflow: EMPLOYEE_DOCUMENT_WORKFLOW,
									storageAccess: EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
									migrationBatchId: manifest.batchId,
									sourceHash: candidate.sourceHash,
								},
							},
							select: { id: true },
						});
						const updated = await tx.userDocuments.updateMany({
							where: {
								id: source.id,
								userId: source.userId,
								updatedAt: source.updatedAt,
								deletedAt: null,
							},
							data: {
								url: employeeDocumentAccessPath(source.id),
								meta: {
									...asRecord(source.meta),
									storedDocumentId: registered.id,
								},
							},
						});
						if (updated.count !== 1) {
							throw new Error(`Document ${source.id} changed during apply.`);
						}
					});
				} catch (error) {
					try {
						await del(uploaded.pathname, { token });
					} catch {
						await append({
							documentId: source.id,
							status: "orphan_cleanup_required",
							pathnameHash: digestEmployeeDocumentMigration(uploaded.pathname),
						});
					}
					throw error;
				}
				await append({ documentId: source.id, status: "migrated" });
			} catch (error) {
				await append({
					documentId: candidate.documentId,
					status: "failed",
					reason: "MIGRATION_STEP_FAILED",
				});
				throw error;
			}
		}
	} finally {
		await journalQueue;
		await output.close();
		await db.$disconnect();
	}
}

if (import.meta.main) {
	await runEmployeeDocumentPrivateMigration(process.argv.slice(2));
}
