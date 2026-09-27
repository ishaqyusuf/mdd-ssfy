import { open, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Database } from "@gnd/db";
import {
	EMPLOYEE_DOCUMENT_KIND,
	EMPLOYEE_DOCUMENT_OWNER_TYPE,
	EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
	isPrivateEmployeeDocumentMeta,
	parseEmployeeStoredDocumentId,
} from "@gnd/documents";
import { parse } from "dotenv";
import { employeeDocumentDatabaseTarget } from "./employee-document-private-migration-policy";

const MAX_ROWS = 500;
const PAGE_SIZE = 50;

export function parseEmployeeDocumentCleanupInventoryArguments(argv: string[]) {
	const values: Record<string, string> = {};
	const allowed = new Set(["--environment", "--limit", "--output"]);
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
	if (environment !== "local" && environment !== "production") {
		throw new Error("Use --environment local|production.");
	}
	const rawLimit = values["--limit"] || "100";
	if (!/^[1-9]\d*$/.test(rawLimit) || Number(rawLimit) > MAX_ROWS) {
		throw new Error(`--limit must be an integer from 1 to ${MAX_ROWS}.`);
	}
	return {
		environment: environment as "local" | "production",
		limit: Number(rawLimit),
		output: values["--output"] ? resolve(values["--output"]) : null,
	};
}

export function classifyEmployeeDocumentCleanupCandidate(input: {
	stored: {
		id: string;
		ownerType: string;
		ownerId: string;
		kind: string;
		provider: string;
		visibility: string;
		status: string;
		deletedAt: Date | null;
		meta: unknown;
	};
	links: Array<{ userId: number; deletedAt: Date | null; meta: unknown }>;
}) {
	const { stored, links } = input;
	if (
		stored.ownerType !== EMPLOYEE_DOCUMENT_OWNER_TYPE ||
		stored.kind !== EMPLOYEE_DOCUMENT_KIND ||
		stored.provider !== "vercel-blob" ||
		stored.visibility !== EMPLOYEE_DOCUMENT_PRIVATE_ACCESS ||
		stored.status !== "deleted" ||
		!stored.deletedAt ||
		!isPrivateEmployeeDocumentMeta(stored.meta) ||
		!stored.meta ||
		typeof stored.meta !== "object" ||
		Array.isArray(stored.meta) ||
		(stored.meta as Record<string, unknown>).cleanupStatus !== "retry_required"
	) {
		return "invalid_stored_record" as const;
	}
	if (links.length !== 1) return "ambiguous_business_link" as const;
	const link = links[0];
	if (
		!link ||
		!link.deletedAt ||
		!Number.isSafeInteger(link.userId) ||
		String(link.userId) !== stored.ownerId ||
		parseEmployeeStoredDocumentId(link.meta) !== stored.id
	) {
		return "live_or_mismatched_business_link" as const;
	}
	return "candidate" as const;
}

export async function inventoryPendingEmployeeDocumentCleanup(
	db: Pick<Database, "storedDocument" | "userDocuments">,
	limit: number,
) {
	const candidates: string[] = [];
	const held: Array<{ storedDocumentId: string; reason: string }> = [];
	let examined = 0;
	let cursor: string | undefined;
	while (examined < limit) {
		const pageSize = Math.min(PAGE_SIZE, limit - examined);
		const rows = await db.storedDocument.findMany({
			where: {
				id: cursor ? { gt: cursor } : undefined,
				ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
				kind: EMPLOYEE_DOCUMENT_KIND,
				provider: "vercel-blob",
				visibility: EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
				status: "deleted",
				deletedAt: { not: null },
				meta: { path: "$.cleanupStatus", equals: "retry_required" },
			},
			orderBy: { id: "asc" },
			take: pageSize,
			select: {
				id: true,
				ownerType: true,
				ownerId: true,
				kind: true,
				provider: true,
				visibility: true,
				status: true,
				deletedAt: true,
				meta: true,
			},
		});
		if (rows.length === 0) break;
		for (const stored of rows) {
			cursor = stored.id;
			examined += 1;
			const deletedLinks = await db.userDocuments.findMany({
				where: {
					meta: { path: "$.storedDocumentId", equals: stored.id },
					deletedAt: { not: null },
				},
				select: { userId: true, deletedAt: true, meta: true },
				take: 2,
			});
			const liveLinks = await db.userDocuments.findMany({
				where: {
					meta: { path: "$.storedDocumentId", equals: stored.id },
					deletedAt: null,
				},
				select: { userId: true, deletedAt: true, meta: true },
				take: 1,
			});
			const result = classifyEmployeeDocumentCleanupCandidate({
				stored,
				links: [...deletedLinks, ...liveLinks],
			});
			if (result === "candidate") candidates.push(stored.id);
			else held.push({ storedDocumentId: stored.id, reason: result });
		}
		if (rows.length < pageSize) break;
	}
	return { examined, candidates, held, truncated: examined === limit };
}

async function loadDatabaseProfile(environment: "local" | "production") {
	const root = resolve(import.meta.dir, "..");
	const selected = parse(
		await readFile(resolve(root, `.env.${environment}`), "utf8"),
	);
	if (!selected.DATABASE_URL) {
		throw new Error(`Selected ${environment} profile must own DATABASE_URL.`);
	}
	process.env.DATABASE_URL = selected.DATABASE_URL;
	return selected.DATABASE_URL;
}

export async function runEmployeeDocumentCleanupInventory(argv: string[]) {
	const options = parseEmployeeDocumentCleanupInventoryArguments(argv);
	const databaseUrl = await loadDatabaseProfile(options.environment);
	const target = employeeDocumentDatabaseTarget(
		databaseUrl,
		options.environment,
	);
	process.stdout.write(
		`${JSON.stringify({ mode: "read_only_inventory", target })}\n`,
	);
	const { db } = await import("@gnd/db");
	try {
		const result = await inventoryPendingEmployeeDocumentCleanup(
			db,
			options.limit,
		);
		const report = {
			contract: "employee-document-cleanup-inventory/v1",
			target,
			...result,
		};
		if (options.output) {
			const file = await open(options.output, "wx", 0o600);
			try {
				await file.writeFile(`${JSON.stringify(report)}\n`);
				await file.sync();
			} finally {
				await file.close();
			}
		}
		process.stdout.write(`${JSON.stringify(report)}\n`);
		return report;
	} finally {
		await db.$disconnect();
	}
}

if (import.meta.main) {
	runEmployeeDocumentCleanupInventory(process.argv.slice(2)).catch((error) => {
		process.stderr.write(
			`${error instanceof Error ? error.message : "Inventory failed."}\n`,
		);
		process.exitCode = 1;
	});
}
