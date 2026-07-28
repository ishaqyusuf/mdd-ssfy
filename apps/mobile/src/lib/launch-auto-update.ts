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

export const DEFAULT_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS = 5 * 60 * 1000;

const DISABLED_AUTO_UPDATE_VALUES = new Set(["false", "0", "off", "no"]);

function pickConfigValue(primary: unknown, fallback: unknown) {
	if (primary === null || primary === undefined) return fallback;
	if (typeof primary === "string" && primary.trim().length === 0) {
		return fallback;
	}
	return primary;
}

export function parseAutoUpdateBoolean(value: unknown, fallback: boolean) {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;
	if (typeof value !== "string") return fallback;

	const normalizedValue = value.trim().toLowerCase();
	if (!normalizedValue) return fallback;

	return !DISABLED_AUTO_UPDATE_VALUES.has(normalizedValue);
}

export function parseAutoUpdateCooldownMs(
	value: unknown,
	fallback = DEFAULT_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS,
) {
	const numericValue =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number(value.trim())
				: Number.NaN;

	if (!Number.isFinite(numericValue) || numericValue <= 0) return fallback;

	return Math.round(numericValue);
}

export function resolveForegroundAutoUpdateConfig({
	envAutoUpdateOnForeground,
	extraAutoUpdateOnForeground,
	envAutoUpdateForegroundCooldownMs,
	extraAutoUpdateForegroundCooldownMs,
}: {
	envAutoUpdateOnForeground?: unknown;
	extraAutoUpdateOnForeground?: unknown;
	envAutoUpdateForegroundCooldownMs?: unknown;
	extraAutoUpdateForegroundCooldownMs?: unknown;
}) {
	return {
		autoUpdateOnForeground: parseAutoUpdateBoolean(
			pickConfigValue(envAutoUpdateOnForeground, extraAutoUpdateOnForeground),
			true,
		),
		foregroundCooldownMs: parseAutoUpdateCooldownMs(
			pickConfigValue(
				envAutoUpdateForegroundCooldownMs,
				extraAutoUpdateForegroundCooldownMs,
			),
		),
	};
}

export function shouldRunForegroundAutoUpdate({
	autoUpdateOnForeground,
	foregroundCooldownMs,
	lastCheckAtMs,
	nowMs,
}: {
	autoUpdateOnForeground: boolean;
	foregroundCooldownMs: number;
	lastCheckAtMs: number | null;
	nowMs: number;
}) {
	if (!autoUpdateOnForeground) return false;
	if (lastCheckAtMs === null) return true;

	return nowMs - lastCheckAtMs >= foregroundCooldownMs;
}

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
