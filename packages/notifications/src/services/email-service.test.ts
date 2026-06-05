// @ts-expect-error package typecheck does not include Bun test types.
import { afterEach, describe, expect, test } from "bun:test";
import { shouldSkipEmail } from "@gnd/utils/envs";
import { resolveEmailRecipients } from "./email-service";

const originalNodeEnv = process.env.NODE_ENV;
const originalTestEmails = process.env.TEST_EMAILS;
const originalSkipEmail = process.env.SKIP_EMAIL;

afterEach(() => {
	process.env.NODE_ENV = originalNodeEnv;
	if (originalTestEmails === undefined) {
		delete process.env.TEST_EMAILS;
	} else {
		process.env.TEST_EMAILS = originalTestEmails;
	}
	if (originalSkipEmail === undefined) {
		delete process.env.SKIP_EMAIL;
	} else {
		process.env.SKIP_EMAIL = originalSkipEmail;
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

describe("shouldSkipEmail", () => {
	test("treats common truthy SKIP_EMAIL values as skip enabled", () => {
		process.env.SKIP_EMAIL = "true";
		expect(shouldSkipEmail()).toBe(true);

		process.env.SKIP_EMAIL = "1";
		expect(shouldSkipEmail()).toBe(true);

		process.env.SKIP_EMAIL = "yes";
		expect(shouldSkipEmail()).toBe(true);
	});

	test("leaves email sending enabled by default", () => {
		delete process.env.SKIP_EMAIL;
		expect(shouldSkipEmail()).toBe(false);
	});
});
