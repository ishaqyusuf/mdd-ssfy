export type ObservabilityEnvironmentInput = {
	deploymentEnvironment?: string;
	dsn?: string;
	nodeEnvironment?: string;
};

export function resolveObservabilityEnvironment({
	deploymentEnvironment,
	nodeEnvironment,
}: Omit<ObservabilityEnvironmentInput, "dsn">) {
	return deploymentEnvironment ?? nodeEnvironment ?? "development";
}

export function isObservabilityEnabled({
	deploymentEnvironment,
	dsn,
	nodeEnvironment,
}: ObservabilityEnvironmentInput) {
	return (
		resolveObservabilityEnvironment({
			deploymentEnvironment,
			nodeEnvironment,
		}) === "production" && Boolean(dsn)
	);
}
