import { getErrorPresentation } from "@gnd/errors";
import { buildErrorReport } from "@gnd/observability";
import * as Sentry from "@sentry/nextjs";
import { createSafeActionClient } from "next-safe-action";

export const actionClient = createSafeActionClient({
	handleServerError(error) {
		const report = buildErrorReport(error, {
			runtime: "dashboard",
			source: "server-action",
		});
		if (report.classified.reportable) {
			Sentry.captureException(report.reportableError, report.captureContext);
		}
		const presentation = getErrorPresentation(report.classified);
		return `${presentation.description} ${presentation.reference}`;
	},
});
