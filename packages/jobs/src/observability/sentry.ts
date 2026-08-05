import { buildErrorReport, isObservabilityEnabled } from "@gnd/observability";
import type { TaskRunContext } from "@trigger.dev/core/v3";

type TaskFailureContext = Pick<
	TaskRunContext,
	"attempt" | "deployment" | "environment" | "run"
>;

export function isSentryEnabled({
	environment,
	nodeEnv,
	dsn,
}: {
	environment?: string;
	nodeEnv?: string;
	dsn?: string;
}) {
	return isObservabilityEnabled({
		deploymentEnvironment: environment,
		dsn,
		nodeEnvironment: nodeEnv,
	});
}

export function getSentrySourceMapUploadConfig({
	authToken,
	environment,
	org,
	project,
	release,
}: {
	authToken?: string;
	environment?: string;
	org?: string;
	project?: string;
	release?: string;
}) {
	if (environment !== "production" || !authToken || !org || !project) {
		return null;
	}

	return {
		authToken,
		org,
		project,
		release,
	};
}

export function shouldCaptureSentryTaskFailure({
	enabled,
	environmentType,
}: {
	enabled: boolean;
	environmentType: string;
}) {
	return enabled && environmentType === "PRODUCTION";
}

export function getSentryTaskFailureContext(
	error: unknown,
	ctx: TaskFailureContext,
	task: string,
) {
	return getSentryTaskFailureReport(error, ctx, task).captureContext;
}

export function getSentryTaskFailureReport(
	error: unknown,
	ctx: TaskFailureContext,
	task: string,
) {
	return buildErrorReport(error, {
		extra: {
			attempt: ctx.attempt.number,
			deploymentVersion: ctx.deployment?.version,
			runId: ctx.run.id,
		},
		operation: task,
		runtime: "jobs",
		source: "trigger-task",
		tags: {
			task,
			trigger_environment: ctx.environment.slug,
			trigger_environment_type: ctx.environment.type,
		},
	});
}
