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
	return (environment ?? nodeEnv) === "production" && Boolean(dsn);
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
	ctx: TaskFailureContext,
	task: string,
) {
	return {
		tags: {
			runtime: "jobs",
			task,
			trigger_environment: ctx.environment.slug,
			trigger_environment_type: ctx.environment.type,
		},
		extra: {
			attempt: ctx.attempt.number,
			runId: ctx.run.id,
			deploymentVersion: ctx.deployment?.version,
		},
	};
}
