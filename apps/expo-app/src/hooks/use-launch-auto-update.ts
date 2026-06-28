import {
	type LaunchAutoUpdatePhase,
	isLaunchAutoUpdateModalVisible,
	shouldRunLaunchAutoUpdate,
} from "@/lib/launch-auto-update";
import config from "@root/app.config";
import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";

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
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;

		let cancelled = false;
		const setPhaseIfMounted = (nextPhase: LaunchAutoUpdatePhase) => {
			if (!cancelled) setPhase(nextPhase);
		};

		const runUpdateCheck = async () => {
			const canRun = shouldRunLaunchAutoUpdate({
				appVariant: String(config.extra?.appVariant ?? ""),
				isDev: __DEV__,
				updatesEnabled: Updates.isEnabled,
			});
			if (!canRun) return;

			setPhaseIfMounted("checking");

			let checkResult: Updates.UpdateCheckResult;
			try {
				checkResult = await Updates.checkForUpdateAsync();
			} catch (error) {
				console.warn("[updates] launch check failed", error);
				setPhaseIfMounted("idle");
				return;
			}

			if (!checkResult.isAvailable && !checkResult.isRollBackToEmbedded) {
				setPhaseIfMounted("idle");
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
				console.warn("[updates] launch update failed", error);
				if (!cancelled) {
					setErrorMessage(getErrorMessage(error));
					setPhase("failed");
				}
			}
		};

		void runUpdateCheck();

		return () => {
			cancelled = true;
		};
	}, []);

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
