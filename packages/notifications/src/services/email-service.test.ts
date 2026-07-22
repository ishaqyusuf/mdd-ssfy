// @ts-expect-error package typecheck does not include Bun test types.
import { afterEach, describe, expect, test } from "bun:test";
import { shouldMockEmail, shouldSkipEmail } from "@gnd/utils/envs";
import {
	resolveEmailRecipients,
	transactionalEmailRequestOptions,
} from "./email-service";

const originalNodeEnv = process.env.NODE_ENV;
const originalTestEmails = process.env.TEST_EMAILS;
const originalSkipEmail = process.env.SKIP_EMAIL;
const originalMockEmailSends = process.env.MOCK_EMAIL_SENDS;
const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
	process.env.NODE_ENV = originalNodeEnv;
	process.env.VERCEL_ENV = originalVercelEnv;
	if (originalTestEmails === undefined) {
		process.env.TEST_EMAILS = undefined;
	} else {
		process.env.TEST_EMAILS = originalTestEmails;
	}
	if (originalSkipEmail === undefined) {
		process.env.SKIP_EMAIL = undefined;
	} else {
		process.env.SKIP_EMAIL = originalSkipEmail;
	}
	if (originalMockEmailSends === undefined) {
		process.env.MOCK_EMAIL_SENDS = undefined;
	} else {
		process.env.MOCK_EMAIL_SENDS = originalMockEmailSends;
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
		process.env.TEST_EMAILS = undefined;

		expect(() =>
			resolveEmailRecipients(["user@example.com"], {
				testEmailMode: true,
			}),
		).toThrow("TEST_EMAILS must be configured for test email mode");
	});
});

describe("transactionalEmailRequestOptions", () => {
	test("passes a stable provider idempotency key when supplied", () => {
		expect(transactionalEmailRequestOptions("inquiry-1-customer")).toEqual({
			idempotencyKey: "inquiry-1-customer",
		});
		expect(transactionalEmailRequestOptions()).toBeUndefined();
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
		process.env.SKIP_EMAIL = undefined;
		expect(shouldSkipEmail()).toBe(false);
	});
});

describe("shouldMockEmail", () => {
	test("treats common truthy MOCK_EMAIL_SENDS values as mock enabled outside production", () => {
		process.env.NODE_ENV = "development";
		process.env.VERCEL_ENV = undefined;

		process.env.MOCK_EMAIL_SENDS = "true";
		expect(shouldMockEmail()).toBe(true);

		process.env.MOCK_EMAIL_SENDS = "1";
		expect(shouldMockEmail()).toBe(true);

		process.env.MOCK_EMAIL_SENDS = "yes";
		expect(shouldMockEmail()).toBe(true);
	});

	test("ignores MOCK_EMAIL_SENDS in production runtimes", () => {
		process.env.MOCK_EMAIL_SENDS = "true";
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = undefined;

		expect(shouldMockEmail()).toBe(false);

		process.env.NODE_ENV = "development";
		process.env.VERCEL_ENV = "production";

		expect(shouldMockEmail()).toBe(false);
	});
});
