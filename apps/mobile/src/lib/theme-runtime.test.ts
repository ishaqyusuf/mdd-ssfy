import { describe, expect, test } from "bun:test";

import {
	createThemeRuntime,
	resolveThemeColorScheme,
	toNativeColorScheme,
} from "./theme-runtime";

describe("mobile theme runtime", () => {
	test("explicit Light and Dark override the device appearance", () => {
		expect(resolveThemeColorScheme("light", "dark")).toBe("light");
		expect(resolveThemeColorScheme("dark", "light")).toBe("dark");
	});

	test("rehydrating Light after a JS reload notifies consumers immediately", () => {
		const runtime = createThemeRuntime();
		let notifications = 0;
		const unsubscribe = runtime.subscribe(() => {
			notifications += 1;
		});

		runtime.setOverride("light");

		expect(runtime.getSnapshot()).toBe("light");
		expect(resolveThemeColorScheme(runtime.getSnapshot(), "dark")).toBe(
			"light",
		);
		expect(notifications).toBe(1);
		unsubscribe();
	});

	test("setting the same override does not emit redundant notifications", () => {
		const runtime = createThemeRuntime("dark");
		let notifications = 0;
		const unsubscribe = runtime.subscribe(() => {
			notifications += 1;
		});

		runtime.setOverride("dark");

		expect(runtime.getSnapshot()).toBe("dark");
		expect(notifications).toBe(0);
		unsubscribe();
	});

	test("System delegates to the current device appearance", () => {
		expect(resolveThemeColorScheme("system", "light")).toBe("light");
		expect(resolveThemeColorScheme("system", "dark")).toBe("dark");
		expect(resolveThemeColorScheme("system", null)).toBe("light");
		expect(toNativeColorScheme("system")).toBeNull();
	});
});
