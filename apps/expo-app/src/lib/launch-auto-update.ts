export type LaunchAutoUpdatePhase =
	| "idle"
	| "checking"
	| "downloading"
	| "updating"
	| "restarting"
	| "failed";

export const AUTO_UPDATE_STEPS = [
	"Downloading",
	"Updating",
	"Restarting",
] as const;

export type AutoUpdateStepLabel = (typeof AUTO_UPDATE_STEPS)[number];

export function shouldRunLaunchAutoUpdate({
	appVariant,
	isDev,
	updatesEnabled,
}: {
	appVariant?: string | null;
	isDev: boolean;
	updatesEnabled: boolean;
}) {
	return !isDev && updatesEnabled && appVariant?.toLowerCase() === "preview";
}

export function getAutoUpdateStepState(
	currentPhase: LaunchAutoUpdatePhase,
	label: AutoUpdateStepLabel,
) {
	const currentIndex = AUTO_UPDATE_STEPS.findIndex(
		(stepLabel) => stepLabel.toLowerCase() === currentPhase,
	);
	const stepIndex = AUTO_UPDATE_STEPS.indexOf(label);

	return {
		active: currentIndex === stepIndex,
		done: currentIndex > stepIndex || currentPhase === "failed",
	};
}

export function isLaunchAutoUpdateModalVisible(phase: LaunchAutoUpdatePhase) {
	return phase !== "idle" && phase !== "checking";
}

export function getLaunchAutoUpdateProgress(
	phase: LaunchAutoUpdatePhase,
	downloadProgress?: number,
) {
	if (phase === "downloading") return Math.max(downloadProgress ?? 0.12, 0.12);
	if (phase === "updating") return 0.86;
	if (phase === "restarting") return 1;
	return 0;
}
