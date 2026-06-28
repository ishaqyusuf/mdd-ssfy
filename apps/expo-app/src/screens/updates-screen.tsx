import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useColors } from "@/hooks/use-color";
import config from "@root/app.config";
import * as Updates from "expo-updates";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

type UpdateAction = "checking" | "downloading" | "restarting" | null;

function formatDate(value?: Date | null) {
	if (!value) return "Unknown";
	return value.toLocaleString();
}

function shortId(value?: string | null) {
	if (!value) return "Embedded build";
	return value.slice(0, 8);
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Something went wrong while talking to the update server.";
}

function InfoRow({
	isLast,
	label,
	value,
}: {
	isLast?: boolean;
	label: string;
	value: string | number | null | undefined;
}) {
	return (
		<View
			className={`flex-row items-center justify-between gap-3 py-3 ${
				isLast ? "" : "border-b border-border/60"
			}`}
		>
			<Text className="text-sm font-medium text-muted-foreground">{label}</Text>
			<Text className="flex-1 text-right text-sm font-semibold text-foreground">
				{value ?? "Not set"}
			</Text>
		</View>
	);
}

function UpdateStep({
	active,
	done,
	label,
}: {
	active?: boolean;
	done?: boolean;
	label: string;
}) {
	return (
		<View className="flex-row items-center gap-3">
			<View
				className={
					done
						? "size-8 items-center justify-center rounded-full bg-primary"
						: active
							? "size-8 items-center justify-center rounded-full bg-secondary"
							: "size-8 items-center justify-center rounded-full border border-border bg-card"
				}
			>
				{active ? (
					<ActivityIndicator size="small" />
				) : done ? (
					<Icon name="Check" className="size-sm text-primary-foreground" />
				) : (
					<View className="size-2 rounded-full bg-muted-foreground/50" />
				)}
			</View>
			<Text className="flex-1 text-sm font-semibold text-foreground">
				{label}
			</Text>
		</View>
	);
}

export default function UpdatesScreen() {
	const colors = useColors();
	const {
		checkError,
		currentlyRunning,
		downloadError,
		downloadProgress,
		isChecking,
		isDownloading,
		isRestarting,
		isUpdateAvailable,
		isUpdatePending,
		lastCheckForUpdateTimeSinceRestart,
	} = Updates.useUpdates();
	const [action, setAction] = useState<UpdateAction>(null);
	const [message, setMessage] = useState(
		"Ready to check for a published update.",
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const status = useMemo(() => {
		if (!Updates.isEnabled) return "Updates disabled";
		if (isRestarting || action === "restarting") return "Restarting";
		if (isUpdatePending) return "Update ready";
		if (isDownloading || action === "downloading") return "Downloading";
		if (isUpdateAvailable) return "Update found";
		if (isChecking || action === "checking") return "Checking";
		return "Up to date";
	}, [
		action,
		isChecking,
		isDownloading,
		isRestarting,
		isUpdateAvailable,
		isUpdatePending,
	]);

	const statusIconName: IconKeys = !Updates.isEnabled
		? "Info"
		: isUpdatePending
			? "CheckCircle2"
			: isChecking || isDownloading || action
				? "Loader2"
				: isUpdateAvailable
					? "Zap"
					: "AppWindow";

	const isBusy = !!action || isChecking || isDownloading || isRestarting;
	const canCheck = Updates.isEnabled && !isBusy;
	const canDownload = canCheck && isUpdateAvailable && !isUpdatePending;
	const canRestart = Updates.isEnabled && isUpdatePending && !isBusy;
	const updateVersion = String(config.extra?.updateVersion ?? "N/A");

	const checkForUpdate = useCallback(async () => {
		setAction("checking");
		setErrorMessage(null);
		setMessage("Checking the EAS Update channel for this build.");

		try {
			const result = await Updates.checkForUpdateAsync();
			if (result.isAvailable) {
				setMessage(
					"A new update is available. Download it when you are ready.",
				);
			} else if (result.isRollBackToEmbedded) {
				setMessage("A rollback to the embedded build is available.");
			} else {
				setMessage(
					`No update is available for this runtime. Reason: ${result.reason}.`,
				);
			}
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
			setMessage(
				"Update checks only work in an installed release or preview build.",
			);
		} finally {
			setAction(null);
		}
	}, []);

	const downloadUpdate = useCallback(async () => {
		setAction("downloading");
		setErrorMessage(null);
		setMessage("Downloading the newest update.");

		try {
			const result = await Updates.fetchUpdateAsync();
			if (result.isNew || result.isRollBackToEmbedded) {
				setMessage("Update downloaded. Restart the app to apply it.");
			} else {
				setMessage("There was no newer update to download.");
			}
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
			setMessage("The update could not be downloaded.");
		} finally {
			setAction(null);
		}
	}, []);

	const restartIntoUpdate = useCallback(async () => {
		setAction("restarting");
		setErrorMessage(null);
		setMessage("Restarting into the downloaded update.");

		try {
			await Updates.reloadAsync();
		} catch (error) {
			setAction(null);
			setErrorMessage(getErrorMessage(error));
			setMessage("The app could not restart into the update.");
		}
	}, []);

	return (
		<SafeArea style={{ backgroundColor: colors.background, flex: 1 }}>
			<View className="flex-1 bg-background">
				<View className="flex-row items-center gap-3 px-4 py-3">
					<BackBtn />
					<Text className="flex-1 text-[22px] font-extrabold text-foreground">
						App updates
					</Text>
				</View>

				<ScrollView
					className="flex-1"
					contentContainerClassName="gap-4 px-4 pb-10 pt-2"
					showsVerticalScrollIndicator={false}
				>
					<View className="gap-4 rounded-2xl bg-card p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="flex-1 gap-2">
								<Text className="text-sm font-semibold uppercase text-muted-foreground">
									Status
								</Text>
								<Text className="text-2xl font-extrabold text-foreground">
									{status}
								</Text>
								<Text className="text-sm leading-5 text-muted-foreground">
									{message}
								</Text>
							</View>
							<View className="size-12 items-center justify-center rounded-full bg-secondary">
								<Icon
									name={statusIconName}
									className="size-lg text-foreground"
								/>
							</View>
						</View>

						{errorMessage ? (
							<View className="flex-row gap-2 rounded-xl bg-destructive/10 p-3">
								<Icon name="AlertCircle" className="size-sm text-destructive" />
								<Text className="flex-1 text-sm leading-5 text-destructive">
									{errorMessage}
								</Text>
							</View>
						) : null}

						{isDownloading || action === "downloading" ? (
							<View className="gap-2">
								<View className="h-2 overflow-hidden rounded-full bg-secondary">
									<View
										style={{
											backgroundColor: colors.primary,
											borderRadius: 999,
											height: "100%",
											width: `${Math.max(8, (downloadProgress ?? 0) * 100)}%`,
										}}
									/>
								</View>
								<Text className="text-xs font-medium text-muted-foreground">
									{Math.round((downloadProgress ?? 0) * 100)}% downloaded
								</Text>
							</View>
						) : null}
					</View>

					<View className="gap-3 rounded-2xl bg-card p-4">
						<UpdateStep
							label="Check the matching EAS Update channel"
							active={isChecking || action === "checking"}
							done={isUpdateAvailable || isUpdatePending}
						/>
						<UpdateStep
							label="Download the update to this device"
							active={isDownloading || action === "downloading"}
							done={isUpdatePending}
						/>
						<UpdateStep
							label="Restart into the downloaded update"
							active={isRestarting || action === "restarting"}
						/>
					</View>

					<View className="gap-3">
						<Pressable
							onPress={checkForUpdate}
							disabled={!canCheck}
							className={`h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary ${
								canCheck ? "active:opacity-80" : "opacity-50"
							}`}
						>
							{isChecking || action === "checking" ? (
								<ActivityIndicator color="white" />
							) : (
								<Icon
									name="Clock"
									className="size-sm text-primary-foreground"
								/>
							)}
							<Text className="text-sm font-extrabold text-primary-foreground">
								Check for update
							</Text>
						</Pressable>

						<View className="flex-row gap-3">
							<Pressable
								onPress={downloadUpdate}
								disabled={!canDownload}
								className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary ${
									canDownload ? "active:opacity-80" : "opacity-50"
								}`}
							>
								<Icon name="Zap" className="size-sm text-foreground" />
								<Text className="text-sm font-extrabold text-foreground">
									Download
								</Text>
							</Pressable>
							<Pressable
								onPress={restartIntoUpdate}
								disabled={!canRestart}
								className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary ${
									canRestart ? "active:opacity-80" : "opacity-50"
								}`}
							>
								<Icon name="ArrowRight" className="size-sm text-foreground" />
								<Text className="text-sm font-extrabold text-foreground">
									Restart
								</Text>
							</Pressable>
						</View>
					</View>

					<View className="rounded-2xl bg-card px-4">
						<InfoRow label="App version" value={config.version} />
						<InfoRow label="Update version" value={updateVersion} />
						<InfoRow label="Enabled" value={Updates.isEnabled ? "Yes" : "No"} />
						<InfoRow label="Channel" value={Updates.channel} />
						<InfoRow label="Runtime" value={Updates.runtimeVersion} />
						<InfoRow
							label="Running"
							value={
								currentlyRunning.isEmbeddedLaunch
									? "Embedded build"
									: "Downloaded update"
							}
						/>
						<InfoRow label="Update ID" value={shortId(Updates.updateId)} />
						<InfoRow
							label="Created"
							value={formatDate(currentlyRunning.createdAt)}
						/>
						<InfoRow
							isLast
							label="Last check"
							value={formatDate(lastCheckForUpdateTimeSinceRestart)}
						/>
					</View>

					<View className="gap-2 rounded-2xl bg-card p-4">
						<View className="flex-row items-center gap-2">
							<Icon name="Info" className="size-sm text-primary" />
							<Text className="text-base font-extrabold text-foreground">
								How auto update works
							</Text>
						</View>
						<Text className="text-sm leading-5 text-muted-foreground">
							Expo applies updates only when the published update matches this
							build's channel and runtime version. Native changes, dependency
							changes, or a new app version usually need a fresh EAS build.
						</Text>
					</View>

					{checkError || downloadError ? (
						<View className="gap-2 rounded-2xl bg-card p-4">
							<Text className="text-base font-extrabold text-foreground">
								Latest update error
							</Text>
							<Text className="text-sm leading-5 text-muted-foreground">
								{(checkError ?? downloadError)?.message}
							</Text>
						</View>
					) : null}
				</ScrollView>
			</View>
		</SafeArea>
	);
}
