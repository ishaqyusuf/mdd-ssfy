import { describe, expect, it } from "bun:test";
import {
	DEFAULT_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS,
	getAutoUpdateStepState,
	getLaunchAutoUpdateProgress,
	isLaunchAutoUpdateModalVisible,
	resolveForegroundAutoUpdateConfig,
	shouldRunForegroundAutoUpdate,
	shouldRunLaunchAutoUpdate,
} from "./launch-auto-update";

describe("launch auto update helpers", () => {
	it("allows launch auto-update only for installed preview builds", () => {
		expect(
			shouldRunLaunchAutoUpdate({
				appVariant: "preview",
				isDev: false,
				updatesEnabled: true,
			}),
		).toBe(true);
		expect(
			shouldRunLaunchAutoUpdate({
				appVariant: "production",
				isDev: false,
				updatesEnabled: true,
			}),
		).toBe(false);
		expect(
			shouldRunLaunchAutoUpdate({
				appVariant: "preview",
				isDev: true,
				updatesEnabled: true,
			}),
		).toBe(false);
		expect(
			shouldRunLaunchAutoUpdate({
				appVariant: "preview",
				isDev: false,
				updatesEnabled: false,
			}),
		).toBe(false);
	});

	it("marks the active and completed launch update steps", () => {
		expect(getAutoUpdateStepState("downloading", "Downloading")).toEqual({
			active: true,
			done: false,
		});
		expect(getAutoUpdateStepState("updating", "Downloading")).toEqual({
			active: false,
			done: true,
		});
		expect(getAutoUpdateStepState("restarting", "Updating")).toEqual({
			active: false,
			done: true,
		});
		expect(getAutoUpdateStepState("failed", "Restarting")).toEqual({
			active: false,
			done: true,
		});
	});

	it("keeps the launch modal hidden while checks are silent", () => {
		expect(isLaunchAutoUpdateModalVisible("idle")).toBe(false);
		expect(isLaunchAutoUpdateModalVisible("checking")).toBe(false);
		expect(isLaunchAutoUpdateModalVisible("downloading")).toBe(true);
		expect(isLaunchAutoUpdateModalVisible("failed")).toBe(true);
	});

	it("maps launch update phases to progress values", () => {
		expect(getLaunchAutoUpdateProgress("downloading", 0.4)).toBe(0.4);
		expect(getLaunchAutoUpdateProgress("downloading", undefined)).toBe(0.12);
		expect(getLaunchAutoUpdateProgress("updating")).toBe(0.86);
		expect(getLaunchAutoUpdateProgress("restarting")).toBe(1);
		expect(getLaunchAutoUpdateProgress("idle")).toBe(0);
	});

	it("resolves foreground auto-update config from env before app config", () => {
		expect(
			resolveForegroundAutoUpdateConfig({
				envAutoUpdateOnForeground: "off",
				extraAutoUpdateOnForeground: true,
				envAutoUpdateForegroundCooldownMs: "120000",
				extraAutoUpdateForegroundCooldownMs: 300000,
			}),
		).toEqual({
			autoUpdateOnForeground: false,
			foregroundCooldownMs: 120000,
		});
	});

	it("falls back to default foreground update config for empty or invalid values", () => {
		expect(
			resolveForegroundAutoUpdateConfig({
				envAutoUpdateOnForeground: "",
				extraAutoUpdateOnForeground: undefined,
				envAutoUpdateForegroundCooldownMs: "not-a-number",
			}),
		).toEqual({
			autoUpdateOnForeground: true,
			foregroundCooldownMs: DEFAULT_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS,
		});
	});

	it("throttles foreground auto-update checks with the configured cooldown", () => {
		expect(
			shouldRunForegroundAutoUpdate({
				autoUpdateOnForeground: false,
				foregroundCooldownMs: 300000,
				lastCheckAtMs: null,
				nowMs: 500000,
			}),
		).toBe(false);
		expect(
			shouldRunForegroundAutoUpdate({
				autoUpdateOnForeground: true,
				foregroundCooldownMs: 300000,
				lastCheckAtMs: null,
				nowMs: 500000,
			}),
		).toBe(true);
		expect(
			shouldRunForegroundAutoUpdate({
				autoUpdateOnForeground: true,
				foregroundCooldownMs: 300000,
				lastCheckAtMs: 300000,
				nowMs: 500000,
			}),
		).toBe(false);
		expect(
			shouldRunForegroundAutoUpdate({
				autoUpdateOnForeground: true,
				foregroundCooldownMs: 300000,
				lastCheckAtMs: 200000,
				nowMs: 500000,
			}),
		).toBe(true);
	});
});
