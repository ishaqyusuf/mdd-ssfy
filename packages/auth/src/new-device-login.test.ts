import { describe, expect, test } from "bun:test";

import {
	hasSeenLoginDevice,
	isNewLoginDevice,
	normalizeLoginDevice,
} from "./new-device-login";

const MAC_CHROME =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const MAC_CHROME_NEWER =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const IPHONE_SAFARI =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

describe("new device login detection", () => {
	test("normalizes user agents to stable browser, OS, and device keys", () => {
		const chrome = normalizeLoginDevice(MAC_CHROME);
		expect(chrome.key).toBe("chrome:macos:desktop");
		expect(chrome.label).toBe("Chrome on macOS (desktop)");

		const safari = normalizeLoginDevice(IPHONE_SAFARI);
		expect(safari.key).toBe("safari:ios:mobile");
		expect(safari.label).toBe("Safari on iOS (mobile)");
	});

	test("treats missing user agents as one unknown device family", () => {
		const device = normalizeLoginDevice(null);
		expect(device.key).toBe("unknown-device");
		expect(device.label).toBe("Unknown device");
		expect(hasSeenLoginDevice(undefined, [{ userAgent: null }])).toBe(true);
	});

	test("matches the same browser device family across browser version changes", () => {
		expect(
			hasSeenLoginDevice(MAC_CHROME_NEWER, [
				{ id: "old", userAgent: MAC_CHROME },
			]),
		).toBe(true);
		expect(
			isNewLoginDevice(MAC_CHROME_NEWER, [
				{ id: "old", userAgent: MAC_CHROME },
			]),
		).toBe(false);
	});

	test("detects a different browser device family as new", () => {
		expect(isNewLoginDevice(IPHONE_SAFARI, [{ userAgent: MAC_CHROME }])).toBe(
			true,
		);
	});

	test("can exclude the just-created session from dealership hook checks", () => {
		expect(
			isNewLoginDevice(
				MAC_CHROME,
				[
					{ id: "current", userAgent: MAC_CHROME },
					{ id: "old-phone", userAgent: IPHONE_SAFARI },
				],
				{
					excludeSessionId: "current",
				},
			),
		).toBe(true);
	});
});
