import { BackBtn } from "@/components/back-btn";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import config from "@root/app.config";
import * as Updates from "expo-updates";
import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
type ActionState = "idle" | "checking" | "downloading" | "restarting" | "error";
function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong while processing updates.";
}
export default function UpdatesScreen() {
  const { currentlyRunning, isUpdateAvailable, isUpdatePending } =
    Updates.useUpdates();
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  useEffect(() => {
    if (isUpdatePending) setActionState("idle");
  }, [isUpdatePending]);
  const isBusy =
    actionState === "checking" ||
    actionState === "downloading" ||
    actionState === "restarting";
  const statusText = useMemo(() => {
    if (actionState === "checking") return "Checking for updates...";
    if (actionState === "downloading") return "Downloading update...";
    if (actionState === "restarting") return "Restarting app...";
    if (isUpdatePending) return "Update downloaded. Restart app to apply it.";
    if (isUpdateAvailable) return "Update available. Download to continue.";
    if (hasChecked) return "No updates available. You are up to date.";
    return "Check for updates to verify your app is on the latest release.";
  }, [actionState, hasChecked, isUpdateAvailable, isUpdatePending]);
  const runTypeMessage = currentlyRunning.isEmbeddedLaunch
    ? "Running built-in bundle"
    : "Running OTA update";
  async function onCheckForUpdates() {
    setErrorMessage(null);
    setActionState("checking");
    setHasChecked(true);
    try {
      await Updates.checkForUpdateAsync();
      setActionState("idle");
    } catch (error) {
      setActionState("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function onDownloadUpdate() {
    setErrorMessage(null);
    setActionState("downloading");
    try {
      await Updates.fetchUpdateAsync();
      setActionState("idle");
    } catch (error) {
      setActionState("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function onRestartNow() {
    setErrorMessage(null);
    setActionState("restarting");
    try {
      await Updates.reloadAsync();
    } catch (error) {
      setActionState("error");
      setErrorMessage(getErrorMessage(error));
    }
  }
  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-background px-4 pb-4 pt-14">
        <View className="flex-row items-center justify-between">
          <BackBtn />
          <Text className="text-lg font-bold text-foreground">App Updates</Text>
          <View className="h-10 w-10" />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
        <View className="gap-4 p-4">
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-base font-semibold text-foreground">Status</Text>
            <Text className="mt-1 text-sm text-muted-foreground">{statusText}</Text>
            {!!errorMessage && (
              <View className="mt-3 flex-row items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <Icon name="TriangleAlert" className="mt-0.5 text-destructive" />
                <Text className="flex-1 text-sm text-destructive">{errorMessage}</Text>
              </View>
            )}
          </View>
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-base font-semibold text-foreground">Actions</Text>
            <View className="mt-3 gap-3">
              <Pressable
                onPress={onCheckForUpdates}
                disabled={isBusy}
                className={`items-center rounded-lg p-3 ${isBusy ? "bg-muted" : "bg-primary active:opacity-80"}`}
              >
                <Text className={isBusy ? "font-semibold text-muted-foreground" : "font-semibold text-primary-foreground"}>
                  Check for updates
                </Text>
              </Pressable>
              {!!isUpdateAvailable && !isUpdatePending && (
                <Pressable
                  onPress={onDownloadUpdate}
                  disabled={isBusy}
                  className={`items-center rounded-lg p-3 ${isBusy ? "bg-muted" : "bg-foreground active:opacity-80"}`}
                >
                  <Text className={isBusy ? "font-semibold text-muted-foreground" : "font-semibold text-background"}>
                    Download update
                  </Text>
                </Pressable>
              )}
              {!!isUpdatePending && (
                <Pressable
                  onPress={onRestartNow}
                  disabled={isBusy}
                  className={`items-center rounded-lg p-3 ${isBusy ? "bg-muted" : "bg-foreground active:opacity-80"}`}
                >
                  <Text className={isBusy ? "font-semibold text-muted-foreground" : "font-semibold text-background"}>
                    Restart and apply update
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-base font-semibold text-foreground">Build Info</Text>
            <View className="mt-2 gap-1">
              <Text className="text-sm text-muted-foreground">Version: {config.version}</Text>
              <Text className="text-sm text-muted-foreground">
                Build:{" "}
                {Platform.select({
                  android: config.android?.version || 1,
                  ios: config.ios?.buildNumber || "1",
                })}
              </Text>
              <Text className="text-sm text-muted-foreground">Launch source: {runTypeMessage}</Text>
              <Text className="text-sm text-muted-foreground">Update ID: {currentlyRunning.updateId ?? "N/A"}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
