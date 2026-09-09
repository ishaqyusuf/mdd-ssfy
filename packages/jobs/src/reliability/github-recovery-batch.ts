import { listGithubReliabilityServices } from "./github-registration";

export async function runGithubRecoveryBatch(input: {
	env: Record<string, string | undefined>;
	environment: string;
	now: () => Date;
	select: (
		serviceIds: string[],
		now: Date,
		limit: number,
	) => Promise<{ id: string; incident: { serviceId: string } }[]>;
	execute: (
		deliveryId: string,
		serviceId: string,
	) => Promise<{ status: string }>;
}) {
	if (
		input.environment !== "PRODUCTION" ||
		input.env.RELIABILITY_GITHUB_RECOVERY_ENABLED !== "true"
	)
		return { status: "disabled", results: [] };
	const serviceIds = listGithubReliabilityServices(input.env);
	if (!serviceIds.length) return { status: "not_configured", results: [] };
	const started = input.now().getTime();
	const due = await input.select(serviceIds, new Date(started), 5);
	if (
		due.length > 5 ||
		due.some((row) => !serviceIds.includes(row.incident.serviceId))
	)
		throw new Error("Invalid recovery selection");
	const results: { deliveryId: string; status: string }[] = [];
	for (const row of due) {
		if (input.now().getTime() - started >= 120_000)
			return { status: "budget_exhausted", results };
		try {
			const result = await input.execute(row.id, row.incident.serviceId);
			results.push({ deliveryId: row.id, status: result.status });
			if (result.status === "rate_limited")
				return { status: "rate_limited", results };
		} catch {
			results.push({ deliveryId: row.id, status: "failed" });
		}
	}
	return {
		status: results.some(
			(row) =>
				!["recovered", "not_eligible", "cooldown", "state_changed"].includes(
					row.status,
				),
		)
			? "attention_required"
			: "complete",
		results,
	};
}
