import { Cron } from "croner";

export function getNextContractorAccountingReportRun(input: {
	cron: string;
	timezone: string;
	after: Date;
}) {
	const nextRun = new Cron(input.cron, {
		timezone: input.timezone,
		mode: "5-part",
	}).nextRun(input.after);
	if (!nextRun) throw new Error("Schedule does not have a future run time.");
	return nextRun;
}
