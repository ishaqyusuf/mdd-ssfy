type SentryEnvironmentInput = {
	deploymentEnvironment?: string;
	dsn?: string;
	nodeEnvironment?: string;
};

export function resolveSentryEnvironment({
	deploymentEnvironment,
	nodeEnvironment,
}: Omit<SentryEnvironmentInput, "dsn">) {
	return deploymentEnvironment ?? nodeEnvironment ?? "development";
}

export function shouldEnableSentry({
	deploymentEnvironment,
	dsn,
	nodeEnvironment,
}: SentryEnvironmentInput) {
	return (
		resolveSentryEnvironment({
			deploymentEnvironment,
			nodeEnvironment,
		}) === "production" && Boolean(dsn)
	);
}
