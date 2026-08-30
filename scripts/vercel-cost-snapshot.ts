const CREDIT_THRESHOLDS = [8, 12, 16, 18] as const;
export const VERCEL_CLI_VERSION = "54.4.1";
const SUBSCRIPTION_SERVICES = new Set([
	"Additional Team Seats",
	"Pro",
	"Speed Insights",
	"Speed Insights Plus",
]);

export interface VercelUsageService {
	name: string;
	effectiveCost: number;
	billedCost: number;
}

export interface VercelUsage {
	period: {
		from: string;
		to: string;
	};
	context: string;
	pricingUnit: string;
	services: VercelUsageService[];
	groupBy?: {
		dimension: string;
		data: Array<{
			name: string;
			services: VercelUsageService[];
		}>;
	};
}

interface CostGuardrailInput {
	infrastructureCost: number;
	cycleDays: number;
	elapsedDays: number;
}

type CostSeverity = "ok" | "warning" | "high" | "critical";

function roundMoney(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function classifyInfrastructureCost(services: VercelUsageService[]) {
	let infrastructureCost = 0;
	let subscriptionCost = 0;

	for (const service of services) {
		if (SUBSCRIPTION_SERVICES.has(service.name)) {
			subscriptionCost += service.effectiveCost;
		} else {
			infrastructureCost += service.effectiveCost;
		}
	}

	return {
		infrastructureCost: roundMoney(infrastructureCost),
		subscriptionCost: roundMoney(subscriptionCost),
	};
}

export function evaluateCostGuardrails({
	infrastructureCost,
	cycleDays,
	elapsedDays,
}: CostGuardrailInput) {
	const boundedElapsedDays = Math.max(elapsedDays, 1 / 24);
	const dailyBurn = infrastructureCost / boundedElapsedDays;
	const crossedThresholds = CREDIT_THRESHOLDS.filter(
		(threshold) => infrastructureCost >= threshold,
	);
	const nextThreshold =
		CREDIT_THRESHOLDS.find((threshold) => infrastructureCost < threshold) ??
		null;

	let severity: CostSeverity = "ok";
	if (infrastructureCost >= 16 || dailyBurn > 0.75) {
		severity = "critical";
	} else if (infrastructureCost >= 12 || dailyBurn > 0.5) {
		severity = "high";
	} else if (infrastructureCost >= 8) {
		severity = "warning";
	}

	return {
		dailyBurn: roundMoney(dailyBurn),
		projectedInfrastructureCost: roundMoney(dailyBurn * cycleDays),
		nextThreshold,
		crossedThresholds,
		severity,
	};
}

export interface CliOptions {
	scope: string;
	from: string;
	to: string;
	cycleEnd: string;
	json: boolean;
	failOnAlert: boolean;
}

function getOption(args: string[], name: string) {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

function parseDate(value: string, option: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error(`${option} must use YYYY-MM-DD`);
	}

	const date = new Date(`${value}T00:00:00.000Z`);
	if (
		Number.isNaN(date.getTime()) ||
		date.toISOString().slice(0, 10) !== value
	) {
		throw new Error(`${option} must be a valid calendar date`);
	}

	return date.getTime();
}

export function parseOptions(args: string[]): CliOptions {
	const now = new Date();
	const defaultTo = now.toISOString().slice(0, 10);
	const scope = getOption(args, "--scope") ?? "gndprodesk";
	const from = getOption(args, "--from");
	const cycleEnd = getOption(args, "--cycle-end");
	const to = getOption(args, "--to") ?? defaultTo;

	if (!from || !cycleEnd) {
		throw new Error(
			"Usage: bun run vercel:cost-snapshot -- --from YYYY-MM-DD --cycle-end YYYY-MM-DD [--to YYYY-MM-DD] [--scope TEAM] [--json] [--fail-on-alert]",
		);
	}

	const fromTime = parseDate(from, "--from");
	const toTime = parseDate(to, "--to");
	const cycleEndTime = parseDate(cycleEnd, "--cycle-end");
	if (fromTime >= toTime) {
		throw new Error("--from must be earlier than --to");
	}
	if (toTime > cycleEndTime) {
		throw new Error("--to must not be later than --cycle-end");
	}

	return {
		scope,
		from,
		to,
		cycleEnd,
		json: args.includes("--json"),
		failOnAlert: args.includes("--fail-on-alert"),
	};
}

function differenceInDays(from: string, to: string) {
	const milliseconds = new Date(to).getTime() - new Date(from).getTime();
	return Math.max(milliseconds / 86_400_000, 0);
}

async function loadUsage(options: CliOptions) {
	const process = Bun.spawn(
		[
			"bunx",
			"--package",
			`vercel@${VERCEL_CLI_VERSION}`,
			"vercel",
			"usage",
			"--scope",
			options.scope,
			"--from",
			options.from,
			"--to",
			options.to,
			"--group-by",
			"project",
			"--format",
			"json",
		],
		{
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);

	if (exitCode !== 0) {
		throw new Error(stderr.trim() || "Vercel usage command failed");
	}

	return JSON.parse(stdout) as VercelUsage;
}

export function buildSnapshot(usage: VercelUsage, options: CliOptions) {
	const costs = classifyInfrastructureCost(usage.services);
	const cycleDays = differenceInDays(options.from, options.cycleEnd);
	const elapsedDays = differenceInDays(options.from, options.to);
	const guardrails = evaluateCostGuardrails({
		infrastructureCost: costs.infrastructureCost,
		cycleDays,
		elapsedDays,
	});
	const projects =
		usage.groupBy?.data
			.map((project) => ({
				name: project.name,
				...classifyInfrastructureCost(project.services),
			}))
			.sort(
				(left, right) =>
					right.infrastructureCost - left.infrastructureCost ||
					left.name.localeCompare(right.name),
			) ?? [];
	const services = usage.services
		.filter((service) => !SUBSCRIPTION_SERVICES.has(service.name))
		.filter((service) => service.effectiveCost > 0)
		.sort(
			(left, right) =>
				right.effectiveCost - left.effectiveCost ||
				left.name.localeCompare(right.name),
		)
		.map((service) => ({
			name: service.name,
			effectiveCost: roundMoney(service.effectiveCost),
		}));

	return {
		capturedAt: new Date().toISOString(),
		period: usage.period,
		scope: usage.context,
		currency: usage.pricingUnit,
		...costs,
		...guardrails,
		projects,
		services,
	};
}

function printSnapshot(snapshot: ReturnType<typeof buildSnapshot>) {
	console.log(`Vercel cost snapshot (${snapshot.capturedAt})`);
	console.log(
		`Infrastructure: $${snapshot.infrastructureCost.toFixed(2)} | Daily burn: $${snapshot.dailyBurn.toFixed(2)} | Projected: $${snapshot.projectedInfrastructureCost.toFixed(2)}`,
	);
	console.log(
		`Severity: ${snapshot.severity} | Crossed: ${snapshot.crossedThresholds.join(", ") || "none"} | Next: ${snapshot.nextThreshold ? `$${snapshot.nextThreshold}` : "none"}`,
	);
	console.log("Projects:");
	for (const project of snapshot.projects) {
		console.log(
			`- ${project.name}: $${project.infrastructureCost.toFixed(2)} infrastructure`,
		);
	}
	console.log("Infrastructure services:");
	for (const service of snapshot.services) {
		console.log(`- ${service.name}: $${service.effectiveCost.toFixed(2)}`);
	}
}

async function main() {
	const options = parseOptions(Bun.argv.slice(2));
	const usage = await loadUsage(options);
	const snapshot = buildSnapshot(usage, options);

	if (options.json) {
		console.log(JSON.stringify(snapshot, null, 2));
	} else {
		printSnapshot(snapshot);
	}

	if (options.failOnAlert && snapshot.severity !== "ok") {
		process.exitCode = 2;
	}
}

if (import.meta.main) {
	await main();
}
