import { describe, expect, test } from "bun:test";
import {
	MANDATORY_SALES_HANDOFF_CHANNEL,
	includeMandatorySalesHandoffChannel,
} from "./sales-handoff-notification-channel";

describe("mandatory Sales Handoff notification channel", () => {
	test("remains visible when ordinary in-app preferences exclude it", () => {
		expect(includeMandatorySalesHandoffChannel(["job_assigned"])).toEqual([
			"job_assigned",
			MANDATORY_SALES_HANDOFF_CHANNEL,
		]);
		expect(
			includeMandatorySalesHandoffChannel([MANDATORY_SALES_HANDOFF_CHANNEL]),
		).toEqual([MANDATORY_SALES_HANDOFF_CHANNEL]);
	});
});
