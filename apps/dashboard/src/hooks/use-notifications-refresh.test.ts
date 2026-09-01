import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./use-notifications.ts", import.meta.url),
	"utf8",
);

describe("notification feed refresh", () => {
	it("polls active notification feeds so cross-session assignments reach workers", () => {
		expect(source).toContain("const NOTIFICATION_REFRESH_INTERVAL_MS = 15_000");
		expect(source).toContain(
			"refetchInterval: NOTIFICATION_REFRESH_INTERVAL_MS",
		);
		expect(source).toContain("refetchIntervalInBackground: false");
	});
});
