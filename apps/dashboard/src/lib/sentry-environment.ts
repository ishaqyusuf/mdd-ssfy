type SentryEnvironmentInput = {
	deploymentEnvironment?: string;
	dsn?: string;
	nodeEnvironment?: string;
};

export function resolveSentryEnvironment({
	deploymentEnvironment,
	nodeEnvironment,
}: Omit<SentryEnvironmentInput, "dsn">) {
	return resolveObservabilityEnvironment({
		deploymentEnvironment,
		nodeEnvironment,
	});
}

export function shouldEnableSentry({
	deploymentEnvironment,
	dsn,
	nodeEnvironment,
}: SentryEnvironmentInput) {
	return isObservabilityEnabled({
		deploymentEnvironment,
		dsn,
		nodeEnvironment,
	});
}
import {
	isObservabilityEnabled,
	resolveObservabilityEnvironment,
} from "@gnd/observability";
