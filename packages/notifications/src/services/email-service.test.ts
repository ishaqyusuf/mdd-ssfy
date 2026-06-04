// @ts-expect-error package typecheck does not include Bun test types.
import { afterEach, describe, expect, test } from "bun:test";
import { resolveEmailRecipients } from "./email-service";

const originalNodeEnv = process.env.NODE_ENV;
const originalTestEmails = process.env.TEST_EMAILS;

afterEach(() => {
	process.env.NODE_ENV = originalNodeEnv;
	if (originalTestEmails === undefined) {
		delete process.env.TEST_EMAILS;
	} else {
		process.env.TEST_EMAILS = originalTestEmails;
	}
});

describe("resolveEmailRecipients", () => {
	test("routes test email mode to TEST_EMAILS instead of the target account", () => {
		process.env.NODE_ENV = "production";
		process.env.TEST_EMAILS = "security@example.com, audit@example.com";

		expect(
			resolveEmailRecipients(["user@example.com"], {
				testEmailMode: true,
			}),
		).toEqual(["security@example.com", "audit@example.com"]);
	});

	test("requires TEST_EMAILS when test email mode is explicit", () => {
		process.env.NODE_ENV = "production";
		delete process.env.TEST_EMAILS;

		expect(() =>
			resolveEmailRecipients(["user@example.com"], {
				testEmailMode: true,
			}),
		).toThrow("TEST_EMAILS must be configured for test email mode");
	});
});
