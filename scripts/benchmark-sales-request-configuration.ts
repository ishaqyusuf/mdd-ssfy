import { readFileSync } from "node:fs";

import {
	type SalesRequestConfiguration,
	serializeSalesRequestConfiguration,
} from "../packages/sales/src/sales-form/request-generation/configuration-serializer";

type SampleStep = {
	id: number;
	uid: string;
	title: string;
};

type SampleRoute = {
	itemTypeUid: string;
	stepUids: string[];
};

type SampleComponent = {
	uid: string;
	title: string;
	stepId: number;
};

type SampleVisibility = {
	componentUid: string;
	[key: string]: unknown;
};

type SampleSetting = {
	settingId: number;
	routes: SampleRoute[];
	rootComponents: SampleComponent[];
	steps: SampleStep[];
	componentCount: number;
	duplicateStepUids: string[];
	sampleComponents: SampleComponent[];
	sampleVisibility: SampleVisibility[];
};

type LocalConfigurationSample = {
	settings: SampleSetting[];
};

type ProjectedConfiguration = {
	componentColumns: string[];
	routes: unknown[];
	schemaVersion: 1;
	steps: Array<{
		id: number;
		uid: string;
		title: string;
		selectionMode?: "single" | "multiple";
		components: Array<[string, string]>;
	}>;
	visibilityByComponentUid: Record<string, unknown>;
};

const CSV_HEADER = [
	"recordType",
	"schemaVersion",
	"componentColumns",
	"stepId",
	"stepUid",
	"stepTitle",
	"selectionMode",
	"componentUid",
	"componentTitle",
	"routeIndex",
	"routeJson",
	"visibilityComponentUid",
	"visibilityJson",
] as const;

const samplePath = new URL(
	"../.brain/analysis/sales-request-local-configuration-sample.json",
	import.meta.url,
);

function loadLocalSample(): LocalConfigurationSample {
	return JSON.parse(
		readFileSync(samplePath, "utf8"),
	) as LocalConfigurationSample;
}

function stepUidForBenchmark(step: SampleStep, duplicateStepUids: Set<string>) {
	// The diagnostic sample intentionally contains both numeric rows for wUGhI.
	// Keep both rows in this format-only fixture without selecting one as truth.
	return duplicateStepUids.has(step.uid) ? `${step.uid}#${step.id}` : step.uid;
}

function buildBenchmarkConfiguration(
	setting: SampleSetting,
): SalesRequestConfiguration {
	const duplicateStepUids = new Set(setting.duplicateStepUids);
	const stepsById = new Map(setting.steps.map((step) => [step.id, step]));
	const configuredSteps = setting.steps.filter((step) => step.id !== 1);
	const configuredStepIds = configuredSteps.map((step) => step.id);
	if (!configuredStepIds.length) {
		throw new Error(
			"The sales-request benchmark needs at least one configured step",
		);
	}

	const componentsByStepId = new Map<
		number,
		Array<{ uid: string; title: string }>
	>();
	const addComponent = (
		stepId: number,
		component: { uid: string; title: string },
	) => {
		if (!stepsById.has(stepId)) {
			throw new Error(`Sample component references missing step ${stepId}`);
		}
		const components = componentsByStepId.get(stepId) ?? [];
		components.push(component);
		componentsByStepId.set(stepId, components);
	};

	for (const component of setting.sampleComponents) {
		addComponent(component.stepId, {
			uid: component.uid,
			title: component.title,
		});
	}

	const generatedComponentCount =
		setting.componentCount - setting.sampleComponents.length;
	if (generatedComponentCount < 0) {
		throw new Error(
			"Sample component count is smaller than its component sample",
		);
	}
	for (let index = 0; index < generatedComponentCount; index += 1) {
		const stepId = configuredStepIds[index % configuredStepIds.length];
		const title =
			index % 11 === 0
				? `Choice ${index}, \"finish\" — 東京`
				: `Choice ${index}`;
		addComponent(stepId, {
			uid: `benchmark-component-${String(index).padStart(3, "0")}`,
			title,
		});
	}

	const steps = setting.steps.map((step) => ({
		id: step.id,
		uid: stepUidForBenchmark(step, duplicateStepUids),
		title: step.title,
		components:
			step.id === 1
				? setting.rootComponents.map(({ uid, title }) => ({ uid, title }))
				: (componentsByStepId.get(step.id) ?? []),
	}));

	const routes = setting.routes
		.filter((route) =>
			route.stepUids.every((uid) => !duplicateStepUids.has(uid)),
		)
		.map((route, index) => ({
			...route,
			rootStepId: 1,
			...(index === 0
				? {
						config: { noHandle: true, hasSwing: false },
						rules: {
							AND: [
								{
									stepUid: "MtJgR",
									operator: "is",
									componentsUid: ["KmUMM"],
								},
							],
							OR: [
								{
									stepUid: "MtJgR",
									operator: "is",
									componentsUid: ["r6lf5"],
								},
							],
						},
					}
				: {}),
		}));

	const visibilityByComponentUid = Object.fromEntries(
		setting.sampleVisibility.map(({ componentUid, ...visibility }) => [
			componentUid,
			visibility,
		]),
	);

	return {
		schemaVersion: 1,
		routes,
		steps,
		visibilityByComponentUid,
	};
}

function csvField(value: string, metrics: CsvMetrics) {
	if (!/[",\r\n]/.test(value)) return value;
	metrics.escapedFields += 1;
	metrics.escapedQuotes += [...value].filter(
		(character) => character === '"',
	).length;
	return `"${value.replaceAll('"', '""')}"`;
}

type CsvMetrics = {
	escapedFields: number;
	escapedQuotes: number;
	nestedJsonCells: number;
};

function stringifyCsvField(value: unknown, metrics: CsvMetrics) {
	if (value === undefined || value === null) return "";
	return csvField(String(value), metrics);
}

function stringifyCsv(payload: ProjectedConfiguration): {
	text: string;
	metrics: CsvMetrics;
	dataRows: number;
} {
	const metrics: CsvMetrics = {
		escapedFields: 0,
		escapedQuotes: 0,
		nestedJsonCells: 0,
	};
	const rows: unknown[][] = [
		[...CSV_HEADER],
		[
			"meta",
			payload.schemaVersion,
			payload.componentColumns.join("|"),
			...Array(CSV_HEADER.length - 3).fill(""),
		],
	];

	for (const step of payload.steps) {
		rows.push([
			"step",
			"",
			"",
			step.id,
			step.uid,
			step.title,
			step.selectionMode ?? "",
			"",
			"",
			"",
			"",
			"",
			"",
		]);
		for (const [uid, title] of step.components) {
			rows.push([
				"component",
				"",
				"",
				step.id,
				"",
				"",
				"",
				uid,
				title,
				"",
				"",
				"",
				"",
			]);
		}
	}

	for (const [routeIndex, route] of payload.routes.entries()) {
		metrics.nestedJsonCells += 1;
		rows.push([
			"route",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			routeIndex,
			JSON.stringify(route),
			"",
			"",
		]);
	}

	for (const componentUid of Object.keys(
		payload.visibilityByComponentUid,
	).sort()) {
		metrics.nestedJsonCells += 1;
		rows.push([
			"visibility",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			componentUid,
			JSON.stringify(payload.visibilityByComponentUid[componentUid]),
		]);
	}

	const text = `${rows
		.map((row) =>
			row.map((value) => stringifyCsvField(value, metrics)).join(","),
		)
		.join("\n")}\n`;
	return { text, metrics, dataRows: rows.length - 1 };
}

function parseCsv(text: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let field = "";
	let quoted = false;

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];
		if (quoted) {
			if (character === '"') {
				if (text[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					quoted = false;
				}
			} else {
				field += character;
			}
			continue;
		}

		if (character === '"' && field.length === 0) {
			quoted = true;
		} else if (character === ",") {
			record.push(field);
			field = "";
		} else if (character === "\n") {
			record.push(field.endsWith("\r") ? field.slice(0, -1) : field);
			records.push(record);
			record = [];
			field = "";
		} else {
			field += character;
		}
	}

	if (quoted)
		throw new Error("CSV benchmark output ended inside a quoted field");
	if (field.length > 0 || record.length > 0) {
		record.push(field);
		records.push(record);
	}
	return records;
}

function validateCsv(
	text: string,
	payload: ProjectedConfiguration,
): {
	parserPasses: number;
	dataRows: number;
	rowTypeChecks: number;
	componentReferenceChecks: number;
	nestedJsonParseCount: number;
	escapedFieldDecodes: number;
	semanticRecordsMatch: boolean;
} {
	const records = parseCsv(text);
	const header = records.shift();
	if (!header || header.join("\u001f") !== CSV_HEADER.join("\u001f")) {
		throw new Error("CSV benchmark header does not match the format contract");
	}

	const expectedDataRows =
		1 +
		payload.steps.length +
		payload.steps.reduce((total, step) => total + step.components.length, 0) +
		payload.routes.length +
		Object.keys(payload.visibilityByComponentUid).length;
	if (records.length !== expectedDataRows) {
		throw new Error(
			`CSV benchmark row count mismatch: expected ${expectedDataRows}, got ${records.length}`,
		);
	}

	const stepIds = new Set(payload.steps.map((step) => step.id));
	let componentReferenceChecks = 0;
	let nestedJsonParseCount = 0;
	let escapedFieldDecodes = 0;
	let routeCount = 0;
	let visibilityCount = 0;
	const parsedRoutes: unknown[] = [];
	const parsedVisibility: Record<string, unknown> = {};
	const parsedComponents: Array<[number, string, string]> = [];
	for (const row of records) {
		if (row.length !== CSV_HEADER.length) {
			throw new Error(`CSV benchmark row has ${row.length} fields`);
		}
		const recordType = row[0];
		switch (recordType) {
			case "meta":
				if (row[1] !== String(payload.schemaVersion)) {
					throw new Error("CSV benchmark schema version mismatch");
				}
				break;
			case "step":
				if (!stepIds.has(Number(row[3]))) {
					throw new Error(`CSV benchmark references an unknown step ${row[3]}`);
				}
				break;
			case "component":
				if (!stepIds.has(Number(row[3]))) {
					throw new Error(
						`CSV benchmark component references an unknown step ${row[3]}`,
					);
				}
				componentReferenceChecks += 1;
				parsedComponents.push([Number(row[3]), row[7] ?? "", row[8] ?? ""]);
				break;
			case "route":
				parsedRoutes.push(JSON.parse(row[10] ?? ""));
				nestedJsonParseCount += 1;
				routeCount += 1;
				break;
			case "visibility":
				parsedVisibility[row[11] ?? ""] = JSON.parse(row[12] ?? "");
				nestedJsonParseCount += 1;
				visibilityCount += 1;
				break;
			default:
				throw new Error(`CSV benchmark has unknown record type ${recordType}`);
		}
		escapedFieldDecodes += row.filter((value) => /[",\r\n]/.test(value)).length;
	}

	return {
		parserPasses: 1,
		dataRows: records.length,
		rowTypeChecks: records.length,
		componentReferenceChecks,
		nestedJsonParseCount,
		escapedFieldDecodes,
		semanticRecordsMatch:
			routeCount === payload.routes.length &&
			visibilityCount ===
				Object.keys(payload.visibilityByComponentUid).length &&
			JSON.stringify(parsedRoutes) === JSON.stringify(payload.routes) &&
			JSON.stringify(parsedVisibility) ===
				JSON.stringify(payload.visibilityByComponentUid) &&
			JSON.stringify(parsedComponents) ===
				JSON.stringify(
					payload.steps.flatMap((step) =>
						step.components.map(([uid, title]) => [step.id, uid, title]),
					),
				),
	};
}

function countKey(value: unknown, key: string): number {
	if (Array.isArray(value))
		return value.reduce((count, entry) => count + countKey(entry, key), 0);
	if (!value || typeof value !== "object") return 0;
	return Object.entries(value).reduce(
		(count, [entryKey, entryValue]) =>
			count + (entryKey === key ? 1 : 0) + countKey(entryValue, key),
		0,
	);
}

function sizeOf(value: string) {
	return {
		utf8Bytes: Buffer.byteLength(value, "utf8"),
		utf16CodeUnits: value.length,
		unicodeCodePoints: [...value].length,
	};
}

async function findTokenEstimate(json: string, csv: string) {
	const candidates = ["gpt-tokenizer", "js-tiktoken", "@dqbd/tiktoken"];
	for (const packageName of candidates) {
		try {
			const tokenizer = (await import(packageName)) as {
				encode?: (value: string) => ArrayLike<unknown>;
				getEncoding?: (name: string) => {
					encode(value: string): ArrayLike<unknown>;
				};
			};
			const encode =
				tokenizer.encode ?? tokenizer.getEncoding?.("cl100k_base")?.encode;
			if (encode) {
				return {
					available: true,
					packageName,
					jsonTokens: encode(json).length,
					csvTokens: encode(csv).length,
				};
			}
		} catch {
			// Tokenizer packages are optional; report a chars-only benchmark when absent.
		}
	}
	return {
		available: false,
		packageName: null,
		jsonTokens: null,
		csvTokens: null,
		note: "No compatible tokenizer dependency is installed; comparison is chars/bytes only.",
	};
}

export async function benchmarkSalesRequestConfiguration() {
	const sample = loadLocalSample();
	const setting = sample.settings[0];
	if (!setting)
		throw new Error("The local sales-request sample has no settings");

	const configuration = buildBenchmarkConfiguration(setting);
	const json = serializeSalesRequestConfiguration(configuration);
	const payload = JSON.parse(json) as ProjectedConfiguration;
	const csv = stringifyCsv(payload);
	const csvValidation = validateCsv(csv.text, payload);
	const jsonAgain = serializeSalesRequestConfiguration(configuration);
	const csvAgain = stringifyCsv(
		JSON.parse(jsonAgain) as ProjectedConfiguration,
	);
	const tokenEstimate = await findTokenEstimate(json, csv.text);

	const jsonSize = sizeOf(json);
	const csvSize = sizeOf(csv.text);
	const componentCount = payload.steps.reduce(
		(total, step) => total + step.components.length,
		0,
	);
	const ambiguousRoutes =
		setting.routes.length -
		setting.routes.filter((route) =>
			route.stepUids.every((uid) => !setting.duplicateStepUids.includes(uid)),
		).length;

	return {
		contract: "sales-request-configuration-format-benchmark/v1",
		mode: "read-only",
		fixture: {
			source: ".brain/analysis/sales-request-local-configuration-sample.json",
			settingId: setting.settingId,
			note: "Shape benchmark only: the diagnostic duplicate UID is retained with numeric-ID aliases; ambiguous source routes are excluded rather than resolved.",
			sourceStepRows: setting.steps.length,
			sourceDuplicateStepUids: setting.duplicateStepUids,
			sourceConfiguredComponentCount: setting.componentCount,
			sourceSampledComponentCount: setting.sampleComponents.length,
			benchmarkStepCount: payload.steps.length,
			benchmarkComponentCount: componentCount,
			benchmarkRootComponentCount: setting.rootComponents.length,
			benchmarkRouteCount: payload.routes.length,
			skippedAmbiguousRouteCount: ambiguousRoutes,
		},
		json: {
			...jsonSize,
			canonical: true,
			validation: {
				wholeDocumentParserPasses: 1,
				stepIdentityChecks: payload.steps.length,
				componentIdentityChecks: componentCount,
				nestedRuleCollections: countKey(payload, "rules"),
			},
		},
		csv: {
			...sizeOf(csv.text),
			dataRows: csv.dataRows,
			columns: CSV_HEADER.length,
			escapedFields: csv.metrics.escapedFields,
			escapedQuotes: csv.metrics.escapedQuotes,
			nestedJsonCells: csv.metrics.nestedJsonCells,
			validation: csvValidation,
		},
		comparison: {
			csvToJsonUtf8ByteRatio: Number(
				(csvSize.utf8Bytes / jsonSize.utf8Bytes).toFixed(3),
			),
			csvExtraUtf8Bytes: csvSize.utf8Bytes - jsonSize.utf8Bytes,
			deterministic: json === jsonAgain && csv.text === csvAgain.text,
			tokenEstimate,
		},
		recommendation: {
			preferred: "json",
			reason:
				"Tuple JSON keeps the nested route/rule graph native, avoids a delimiter/quote layer, and validates as one document. CSV remains useful for a separate flat component export, but nested route and visibility values would still need embedded JSON and additional parsing.",
			validationCaveat:
				"Counts are deterministic structural work, not wall-clock timings; CSV validation includes RFC-style field parsing, component step-reference checks, and one nested JSON parse per route/visibility cell.",
		},
		safety: { writesPerformed: false },
	};
}

if (import.meta.main) {
	benchmarkSalesRequestConfiguration()
		.then((report) =>
			process.stdout.write(`${JSON.stringify(report, null, 2)}\n`),
		)
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		});
}
