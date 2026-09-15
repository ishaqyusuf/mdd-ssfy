import { db, type Prisma } from "@gnd/db";
import { recordAssistantDiagnostic } from "@gnd/db/queries";
import { captureAssistantErrorEvent } from "@api/observability/sentry";
import { recordAssistantCaptureHealth } from "./capture-health";
import { assistantMonitoringLink } from "./monitoring-link";
import {
	buildAssistantDiagnostic,
	type AssistantDiagnosticContext,
} from "./diagnostic-details";

type Report = ReturnType<typeof buildAssistantDiagnostic> & {
	details: ReturnType<typeof buildAssistantDiagnostic>["details"] & {
		monitoring?: { status: "submitted" | "unavailable" | "failed"; eventId?: string; organization?: string };
	};
};
type CaptureDependencies = {
	store: (report: Report) => Promise<unknown>;
	monitor: (report: Report) => string | undefined;
	fallback: (report: Report) => void;
	timeoutMs: number;
	health: typeof recordAssistantCaptureHealth;
};

const defaults: CaptureDependencies = {
	monitor: captureAssistantErrorEvent,
	health: recordAssistantCaptureHealth,
	store: (report) =>
		recordAssistantDiagnostic(db, {
			...report,
			details: report.details as Prisma.InputJsonValue,
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		}),
	fallback: (report) => {
		// Only the allowlisted report crosses the independent fallback boundary.
		console.error("assistant_diagnostic_fallback", report);
	},
	timeoutMs: 750,
};

export async function captureAssistantDiagnostic(
	error: unknown,
	context: AssistantDiagnosticContext,
	dependencies: Partial<CaptureDependencies> = {},
) {
	const deps = { ...defaults, ...dependencies };
	const report: Report = buildAssistantDiagnostic(error, context);
	try {
		const eventId = deps.monitor(report);
		report.details.monitoring = eventId && /^[a-f0-9]{32}$/.test(eventId)
			? { status: "submitted", eventId }
			: { status: "unavailable" };
		const candidate = { monitoring: { ...report.details.monitoring, organization: process.env.SENTRY_ORG } };
		if (assistantMonitoringLink(candidate)) report.details.monitoring.organization = process.env.SENTRY_ORG;
	} catch {
		report.details.monitoring = { status: "failed" };
	}
	let timer: ReturnType<typeof setTimeout> | undefined;
	let stored = false;
	try {
		await Promise.race([
			deps.store(report),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error("diagnostic timeout")),
					deps.timeoutMs,
				);
			}),
		]);
		stored = true;
		return { reference: report.reference, recorded: true };
	} catch {
		try {
			deps.fallback(report);
		} catch {
			/* Never recurse or replace the business outcome. */
		}
		return { reference: report.reference, recorded: false };
	} finally {
		clearTimeout(timer);
		try { await deps.health({ stored, monitoring: report.details.monitoring?.status ?? "unavailable" }); }
		catch { try { console.error("assistant_capture_health_unavailable", { reference: report.reference }); } catch { /* Never replace the original result. */ } }
	}
}
