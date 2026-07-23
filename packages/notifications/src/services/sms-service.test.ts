// @ts-expect-error package typecheck does not include Bun test types.
import { afterEach, describe, expect, test } from "bun:test";
import { SmsService } from "./sms-service";

const originalEnv = {
	SMS_PROVIDER: process.env.SMS_PROVIDER,
	TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
	TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
	TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
	TWILIO_SMS_FROM: process.env.TWILIO_SMS_FROM,
};

afterEach(() => {
	for (const [key, value] of Object.entries(originalEnv)) {
		process.env[key] = value;
	}
});

describe("SMS service", () => {
	test("reports a skipped delivery when the provider is not configured", async () => {
		process.env.SMS_PROVIDER = undefined;
		process.env.TWILIO_ACCOUNT_SID = undefined;
		process.env.TWILIO_AUTH_TOKEN = undefined;
		process.env.TWILIO_MESSAGING_SERVICE_SID = undefined;
		process.env.TWILIO_SMS_FROM = undefined;

		const result = await new SmsService().sendBulk([
			{
				user: {
					id: 0,
					profileId: 0,
					name: "Ada",
					phoneNo: "+13055550100",
				},
				message: "Your invoice is ready.",
			},
		]);

		expect(result).toEqual({
			sent: 0,
			skipped: 1,
			failed: 0,
			deliveries: [
				{
					inputIndex: 0,
					status: "skipped",
					providerStatus: "provider_not_configured",
				},
			],
		});
	});
});
