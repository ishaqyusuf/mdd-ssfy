import { afterEach, describe, expect, it } from "bun:test";
import { resolveEmailRecipients } from "../src/services/email-service";

const originalNodeEnv = process.env.NODE_ENV;
const originalTestEmails = process.env.TEST_EMAILS;

afterEach(() => {
	process.env.NODE_ENV = originalNodeEnv;
	if (originalTestEmails === undefined) {
		process.env.TEST_EMAILS = undefined;
	} else {
		process.env.TEST_EMAILS = originalTestEmails;
	}
});

describe("resolveEmailRecipients", () => {
	it("routes development emails to TEST_EMAILS when configured", () => {
		process.env.NODE_ENV = "development";
		process.env.TEST_EMAILS = "one@gndprodesk.com,two@gndprodesk.com";

		expect(resolveEmailRecipients(["customer@example.com"])).toEqual([
			"one@gndprodesk.com",
			"two@gndprodesk.com",
		]);
	});

	it("keeps production recipients without test mode", () => {
		process.env.NODE_ENV = "production";
		process.env.TEST_EMAILS = "test@gndprodesk.com";

		expect(resolveEmailRecipients(["customer@example.com"])).toEqual([
			"customer@example.com",
		]);
	});

	it("routes production emails to TEST_EMAILS with validated test mode", () => {
		process.env.NODE_ENV = "production";
		process.env.TEST_EMAILS = "one@gndprodesk.com,two@gndprodesk.com";

		expect(
			resolveEmailRecipients(["customer@example.com"], {
				testEmailMode: true,
			}),
		).toEqual(["one@gndprodesk.com", "two@gndprodesk.com"]);
	});

	it("keeps production recipients when non-super-admin test mode is not validated", () => {
		process.env.NODE_ENV = "production";
		process.env.TEST_EMAILS = "test@gndprodesk.com";

		expect(
			resolveEmailRecipients(["customer@example.com"], {
				testEmailMode: false,
			}),
		).toEqual(["customer@example.com"]);
	});

	it("ignores blank entries in TEST_EMAILS", () => {
		process.env.NODE_ENV = "production";
		process.env.TEST_EMAILS = "one@gndprodesk.com, ,two@gndprodesk.com";

		expect(
			resolveEmailRecipients(["customer@example.com"], {
				testEmailMode: true,
			}),
		).toEqual(["one@gndprodesk.com", "two@gndprodesk.com"]);
	});
});
