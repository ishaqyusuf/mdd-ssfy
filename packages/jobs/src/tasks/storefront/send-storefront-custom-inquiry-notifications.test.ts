import { describe, expect, test } from "bun:test";

const taskSource = await Bun.file(
	new URL("./send-storefront-custom-inquiry-notifications.ts", import.meta.url),
).text();

describe("storefront custom inquiry notification task imports", () => {
	test("keeps runtime-only services out of the task startup graph", () => {
		expect(taskSource).not.toMatch(
			/^import .*"(?:@gnd\/auth\/utils|@gnd\/db|@gnd\/notifications\/services\/email-service)"/m,
		);
		expect(taskSource).toMatch(/import\(\s*"@gnd\/auth\/utils"\s*\)/);
		expect(taskSource).toMatch(/import\(\s*"@gnd\/db"\s*\)/);
		expect(taskSource).toMatch(
			/import\(\s*"@gnd\/notifications\/services\/email-service"\s*\)/,
		);
	});
});
