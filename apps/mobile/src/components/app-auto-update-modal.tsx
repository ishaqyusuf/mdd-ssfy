import { AppAutoUpdateStep } from "@/components/app-auto-update-step";
import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-color";
import { useLaunchAutoUpdate } from "@/hooks/use-launch-auto-update";
import {
	AUTO_UPDATE_STEPS,
	getAutoUpdateStepState,
	getLaunchAutoUpdateProgress,
} from "@/lib/launch-auto-update";
import { StatusBar } from "expo-status-bar";
import { Modal, StyleSheet, View } from "react-native";

export function AppAutoUpdateModal() {
	const colors = useColors();
	const { dismissFailure, downloadProgress, errorMessage, phase, visible } =
		useLaunchAutoUpdate();

	const failed = phase === "failed";
	const progress = getLaunchAutoUpdateProgress(phase, downloadProgress);
	const title = failed
		? "Update paused"
		: phase === "downloading"
			? "Downloading update"
			: phase === "updating"
				? "Applying update"
				: "Restarting app";
	const message = failed
		? (errorMessage ?? "The update could not be applied.")
		: phase === "downloading"
			? "A new version is available. Keep the app open while it downloads."
			: phase === "updating"
				? "Preparing the new version and verifying the update."
				: "Restarting into the updated app.";

	return (
		<Modal
			animationType="fade"
			onRequestClose={() => undefined}
			presentationStyle="fullScreen"
			visible={visible}
		>
			<SafeArea style={{ backgroundColor: colors.background }}>
				<StatusBar
					backgroundColor={colors.background}
					style={colors.background === "rgb(15, 23, 42)" ? "light" : "dark"}
				/>
				<View style={styles.content}>
					<View
						style={[
							styles.iconPlate,
							{
								backgroundColor: failed ? colors.destructive : colors.secondary,
							},
						]}
					>
						<Icon
							name={failed ? "AlertCircle" : "Zap"}
							className={
								failed
									? "size-xl text-destructive-foreground"
									: "size-xl text-primary"
							}
						/>
					</View>

					<View style={styles.copy}>
						<Text className="text-center text-3xl font-extrabold capitalize text-foreground">
							{title}
						</Text>
						<Text className="text-center text-base leading-6 text-muted-foreground">
							{message}
						</Text>
					</View>

					{!failed ? (
						<View style={styles.progressSection}>
							<View
								style={[
									styles.progressTrack,
									{ backgroundColor: colors.secondary },
								]}
							>
								<View
									style={[
										styles.progressFill,
										{
											backgroundColor: colors.primary,
											width: `${Math.round(progress * 100)}%`,
										},
									]}
								/>
							</View>

							<View style={styles.steps}>
								{AUTO_UPDATE_STEPS.map((label) => {
									const state = getAutoUpdateStepState(phase, label);
									return (
										<AppAutoUpdateStep key={label} label={label} {...state} />
									);
								})}
							</View>
						</View>
					) : (
						<Button className="h-12 w-full" onPress={dismissFailure}>
							<Text>Continue</Text>
						</Button>
					)}
				</View>
			</SafeArea>
		</Modal>
	);
}

const styles = StyleSheet.create({
	content: {
		alignItems: "center",
		flex: 1,
		gap: 28,
		justifyContent: "center",
		paddingHorizontal: 28,
	},
	copy: {
		gap: 12,
	},
	iconPlate: {
		alignItems: "center",
		borderRadius: 34,
		height: 68,
		justifyContent: "center",
		width: 68,
	},
	progressFill: {
		borderRadius: 999,
		height: "100%",
	},
	progressSection: {
		gap: 20,
		width: "100%",
	},
	progressTrack: {
		borderRadius: 999,
		height: 8,
		overflow: "hidden",
		width: "100%",
	},
	steps: {
		gap: 16,
	},
});
