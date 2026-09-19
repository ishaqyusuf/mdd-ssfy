/** Local, read-only baseline for the sales component DB loader. */
import {
	getStaticStepComponentCatalog,
	getStepComponentUsageRanks,
	getStepComponents,
} from "../src/db/queries/sales-form";
import { db } from "@gnd/db";
import type { TRPCContext } from "../src/trpc/init";
import {
	getFreshNewSalesFormStepRouting,
	projectInteractiveNewSalesFormRouting,
} from "../src/db/queries/new-sales-form";

const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (
	target.protocol !== "mysql:" ||
	target.hostname !== "127.0.0.1" ||
	target.port !== "3307" ||
	target.pathname !== "/gnd-prisma2"
) {
	throw new Error("Catalog baseline requires the verified local database");
}

function percentile(values: number[], percentage: number) {
	const sorted = [...values].sort((a, b) => a - b);
	return Math.round(sorted[Math.ceil(sorted.length * percentage) - 1] ?? 0);
}

try {
	const ctx = { db } as TRPCContext;
	if (process.env.SALES_CATALOG_RANK_BREAKDOWN === "1") {
		const step = await db.dykeSteps.findFirstOrThrow({
			where: { title: "Item Type", deletedAt: null },
			select: { id: true, title: true },
			orderBy: { id: "asc" },
		});
		const selector = { stepId: step.id, stepTitle: step.title, isCustom: false };
		const [components, ranks] = await Promise.all([
			getStaticStepComponentCatalog(ctx, selector),
			getStepComponentUsageRanks(ctx, selector),
		]);
		const usageById = new Map(ranks.map(({ id, statistics }) => [id, statistics]));
		console.info(JSON.stringify({
			stepId: step.id,
			ordered: components.map((component) => ({
				id: component.id,
				title: component.title,
				uid: component.uid,
				statistics: usageById.get(component.id) ?? 0,
			})).sort((a, b) =>
				b.statistics - a.statistics ||
				String(a.title || "").localeCompare(String(b.title || "")) ||
				String(a.uid || "").localeCompare(String(b.uid || ""))),
		}));
	} else if (process.env.SALES_CATALOG_ROUTING_BREAKDOWN === "1") {
		const routing = await getFreshNewSalesFormStepRouting(ctx, {
			includeCustomComponents: false,
		});
		const steps = Object.values(routing.stepsByUid);
		const components = steps.flatMap((step) => step.components);
		const compact = projectInteractiveNewSalesFormRouting(routing);
		const fieldBytes = (rows: Array<Record<string, unknown>>) =>
			Object.fromEntries(
				Object.keys(rows[0] || {}).map((key) => [
					key,
					rows.reduce((bytes, row) =>
						bytes + Buffer.byteLength(JSON.stringify(row[key])), 0),
				]),
			);
		console.info(JSON.stringify({
			totalBytes: Buffer.byteLength(JSON.stringify(routing)),
			compactBytes: Buffer.byteLength(JSON.stringify(compact)),
			stepCount: steps.length,
			componentCount: components.length,
			stepFieldBytes: fieldBytes(steps),
			componentFieldBytes: fieldBytes(components),
			sections: Object.entries(routing).map(([section, value]) => ({
				section,
				bytes: Buffer.byteLength(JSON.stringify(value)),
				entries: value && typeof value === "object"
					? Object.keys(value).length : null,
			})),
		}));
	} else {
	const steps = await db.dykeSteps.findMany({
		where: { title: { in: ["Item Type", "Door", "Moulding", "Jamb Size"] }, deletedAt: null },
		select: { id: true, title: true },
		orderBy: { id: "asc" },
	});
	const representativeSteps = steps.filter(
		(step, index) => steps.findIndex((candidate) => candidate.title === step.title) === index,
	);
	const samples = Math.min(30, Math.max(1, Number(process.env.SALES_CATALOG_SAMPLES || 10)));
	for (const step of representativeSteps) {
		const times: number[] = [];
		let rows = 0;
		let bytes = 0;
		for (let sample = 0; sample < samples; sample++) {
			const startedAt = performance.now();
			const input = { stepId: step.id, stepTitle: step.title, ...(process.env.SALES_CATALOG_NON_CUSTOM === "1" ? { isCustom: false } : {}) };
			const components = process.env.SALES_CATALOG_STATIC === "1"
				? await getStaticStepComponentCatalog(ctx, input)
				: await getStepComponents(ctx, { ...input, fresh: true });
			times.push(performance.now() - startedAt);
			rows = components.length;
			bytes = Buffer.byteLength(JSON.stringify(components));
		}
		console.info(JSON.stringify({
			stepId: step.id,
			title: step.title,
			mode: process.env.SALES_CATALOG_STATIC === "1" ? "static-db" : "fresh-db",
			samples: times.length,
			rows,
			bytes,
			p50Ms: percentile(times, 0.5),
			p95Ms: percentile(times, 0.95),
		}));
	}
	}
} finally {
	await db.$disconnect();
}
