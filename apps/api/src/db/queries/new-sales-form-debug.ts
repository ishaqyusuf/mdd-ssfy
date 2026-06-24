import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, parse, resolve } from "node:path";

type CaptureNewSalesFormSavePayloadInput = {
	action: "save-draft" | "save-final";
	payload: unknown;
	userId?: number | null;
};

type CaptureNewSalesFormSavePayloadOptions = {
	nodeEnv?: string;
	rootDir?: string;
	now?: Date;
};

const DEBUG_SAVE_DIR = "debug/new-sales-form-save-payloads";

export async function captureNewSalesFormSavePayload(
	input: CaptureNewSalesFormSavePayloadInput,
	options: CaptureNewSalesFormSavePayloadOptions = {},
) {
	const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
	if (nodeEnv !== "development") return null;

	try {
		const now = options.now ?? new Date();
		const rootDir = await resolveProjectRoot(options.rootDir ?? process.cwd());
		const date = now.toISOString().slice(0, 10);
		const dir = join(rootDir, DEBUG_SAVE_DIR, date);
		await mkdir(dir, { recursive: true });

		const payload = asRecord(input.payload);
		const fileName = buildCaptureFileName({
			action: input.action,
			type: typeof payload.type === "string" ? payload.type : null,
			salesId:
				typeof payload.salesId === "number" && Number.isFinite(payload.salesId)
					? payload.salesId
					: null,
			slug: typeof payload.slug === "string" ? payload.slug : null,
			now,
		});
		const filePath = join(dir, fileName);

		await writeFile(
			filePath,
			`${JSON.stringify(
				{
					capturedAt: now.toISOString(),
					action: input.action,
					nodeEnv,
					userId: input.userId ?? null,
					summary: summarizeSavePayload(input.payload),
					payload: input.payload,
				},
				jsonReplacer,
				2,
			)}\n`,
			"utf8",
		);

		return filePath;
	} catch (error) {
		console.error("Unable to capture new sales form save payload", error);
		return null;
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function summarizeSavePayload(payload: unknown) {
	const record = asRecord(payload);
	const lineItems = Array.isArray(record.lineItems) ? record.lineItems : [];
	const extraCosts = Array.isArray(record.extraCosts) ? record.extraCosts : [];

	return {
		type: typeof record.type === "string" ? record.type : null,
		salesId: typeof record.salesId === "number" ? record.salesId : null,
		slug: typeof record.slug === "string" ? record.slug : null,
		autosave: typeof record.autosave === "boolean" ? record.autosave : null,
		lineItemCount: lineItems.length,
		extraCostCount: extraCosts.length,
	};
}

function buildCaptureFileName(input: {
	action: "save-draft" | "save-final";
	type: string | null;
	salesId: number | null;
	slug: string | null;
	now: Date;
}) {
	const time = input.now
		.toISOString()
		.slice(11, 23)
		.replaceAll(":", "-")
		.replace(".", "-");
	const identity =
		input.salesId != null
			? `sales-${input.salesId}`
			: input.slug
				? safeFilePart(input.slug)
				: "new";
	return `${[
		time,
		input.action,
		safeFilePart(input.type || "unknown"),
		identity,
	].join("__")}.json`;
}

function safeFilePart(value: string) {
	return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function jsonReplacer(_key: string, value: unknown) {
	if (typeof value === "bigint") return value.toString();
	return value;
}

async function resolveProjectRoot(startDir: string) {
	let current = resolve(startDir);
	const root = parse(current).root;

	while (true) {
		if (await isWorkspaceRoot(current)) return current;
		if (current === root) return resolve(startDir);
		current = resolve(current, "..");
	}
}

async function isWorkspaceRoot(dir: string) {
	try {
		const packageJsonPath = join(dir, "package.json");
		const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
			workspaces?: unknown;
		};
		if (!Array.isArray(packageJson.workspaces)) return false;
		await stat(join(dir, "brain"));
		return true;
	} catch {
		return false;
	}
}
