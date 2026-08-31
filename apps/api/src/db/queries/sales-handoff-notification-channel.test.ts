import { describe, expect, test } from "bun:test";
import {
	MANDATORY_SALES_HANDOFF_CHANNEL,
	includeMandatoryOperationalChannels,
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

	test("always includes guarded production and dispatch workflow events", () => {
		expect(includeMandatoryOperationalChannels([])).toEqual([
			"sales_handoff_action_escalation",
			"dispatch_packing_delay",
			"sales_production_submission_material_review",
			"sales_production_submission_material_approved",
			"sales_production_submission_material_rejected",
			"sales_production_assigned",
			"sales_production_unassigned",
			"sales_production_submitted",
			"sales_dispatch_assigned",
			"sales_dispatch_unassigned",
			"sales_dispatch_date_updated",
		]);
	});
});
