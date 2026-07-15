import {
	type LaunchAutoUpdatePhase,
	isLaunchAutoUpdateModalVisible,
	resolveForegroundAutoUpdateConfig,
	shouldRunForegroundAutoUpdate,
	shouldRunLaunchAutoUpdate,
} from "@/lib/launch-auto-update";
import config from "@root/app.config";
import * as Updates from "expo-updates";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

const STEP_DELAY_MS = 650;

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "The update could not be applied.";
}

export function useLaunchAutoUpdate() {
	const { downloadProgress } = Updates.useUpdates();
	const [phase, setPhase] = useState<LaunchAutoUpdatePhase>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const launchCheckStartedRef = useRef(false);
	const checkingRef = useRef(false);
	const lastCheckAtMsRef = useRef<number | null>(null);
	const appStateRef = useRef(AppState.currentState);
	const foregroundAutoUpdateConfig = useMemo(
		() =>
			resolveForegroundAutoUpdateConfig({
				envAutoUpdateOnForeground:
					process.env.EXPO_PUBLIC_AUTO_UPDATE_ON_FOREGROUND,
				extraAutoUpdateOnForeground: config.extra?.autoUpdateOnForeground,
				envAutoUpdateForegroundCooldownMs:
					process.env.EXPO_PUBLIC_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS,
				extraAutoUpdateForegroundCooldownMs:
					config.extra?.autoUpdateForegroundCooldownMs,
			}),
		[],
	);

	useEffect(() => {
		let cancelled = false;
		const setPhaseIfMounted = (nextPhase: LaunchAutoUpdatePhase) => {
			if (!cancelled) setPhase(nextPhase);
		};

		const runUpdateCheck = async ({
			bypassCooldown = false,
			reason,
		}: {
			bypassCooldown?: boolean;
			reason: "launch" | "foreground";
		}) => {
			const canRun = shouldRunLaunchAutoUpdate({
				appVariant: String(config.extra?.appVariant ?? ""),
				isDev: __DEV__,
				updatesEnabled: Updates.isEnabled,
			});
			if (!canRun) return;
			if (checkingRef.current) return;

			const nowMs = Date.now();
			if (
				!bypassCooldown &&
				!shouldRunForegroundAutoUpdate({
					autoUpdateOnForeground:
						foregroundAutoUpdateConfig.autoUpdateOnForeground,
					foregroundCooldownMs: foregroundAutoUpdateConfig.foregroundCooldownMs,
					lastCheckAtMs: lastCheckAtMsRef.current,
					nowMs,
				})
			) {
				return;
			}

			checkingRef.current = true;
			lastCheckAtMsRef.current = nowMs;
			setPhaseIfMounted("checking");

			let checkResult: Updates.UpdateCheckResult;
			try {
				checkResult = await Updates.checkForUpdateAsync();
			} catch (error) {
				console.warn(`[updates] ${reason} check failed`, error);
				setPhaseIfMounted("idle");
				checkingRef.current = false;
				return;
			}

			if (!checkResult.isAvailable && !checkResult.isRollBackToEmbedded) {
				setPhaseIfMounted("idle");
				checkingRef.current = false;
				return;
			}

			setErrorMessage(null);
			setPhaseIfMounted("downloading");

			try {
				const fetchResult = await Updates.fetchUpdateAsync();

				if (!fetchResult.isNew && !fetchResult.isRollBackToEmbedded) {
					setPhaseIfMounted("idle");
					return;
				}

				setPhaseIfMounted("updating");
				await delay(STEP_DELAY_MS);
				setPhaseIfMounted("restarting");
				await delay(STEP_DELAY_MS);
				await Updates.reloadAsync();
			} catch (error) {
				console.warn(`[updates] ${reason} update failed`, error);
				if (!cancelled) {
					setErrorMessage(getErrorMessage(error));
					setPhase("failed");
				}
			} finally {
				checkingRef.current = false;
			}
		};

		if (!launchCheckStartedRef.current) {
			launchCheckStartedRef.current = true;
			void runUpdateCheck({ bypassCooldown: true, reason: "launch" });
		}

		const subscription = AppState.addEventListener("change", (nextAppState) => {
			const previousAppState = appStateRef.current;
			appStateRef.current = nextAppState;

			if (
				(previousAppState === "background" || previousAppState === "inactive") &&
				nextAppState === "active"
			) {
				void runUpdateCheck({ reason: "foreground" });
			}
		});

		return () => {
			cancelled = true;
			subscription.remove();
		};
	}, [
		foregroundAutoUpdateConfig.autoUpdateOnForeground,
		foregroundAutoUpdateConfig.foregroundCooldownMs,
	]);

	return {
		dismissFailure: () => {
			setPhase("idle");
			setErrorMessage(null);
		},
		downloadProgress,
		errorMessage,
		phase,
		visible: isLaunchAutoUpdateModalVisible(phase),
	};
}
