import { describe, expect, test } from "bun:test";
import {
	resolveReminderAmount,
	resolveReminderPlanLabel,
} from "./reminder-pay-plan";

describe("reminder pay plan helpers", () => {
	test("resolves numeric pay plans", () => {
		expect(resolveReminderAmount({ due: 2000, payPlan: 25 })).toBe(500);
		expect(resolveReminderAmount({ due: 2000, payPlan: 50 })).toBe(1000);
		expect(resolveReminderAmount({ due: 2000, payPlan: 100 })).toBe(2000);
	});

	test("resolves full pay plan", () => {
		expect(resolveReminderAmount({ due: 2000, payPlan: "full" })).toBe(2000);
	});

	test("resolves custom pay plans from preferredAmount", () => {
		expect(
			resolveReminderAmount({
				due: 2000,
				payPlan: "custom",
				preferredAmount: 650,
			}),
		).toBe(650);
	});

	test("treats flexible pay plans as customer-entered at checkout", () => {
		expect(resolveReminderAmount({ due: 2000, payPlan: "flexible" })).toBe(0);
		expect(resolveReminderPlanLabel({ payPlan: "flexible" })).toBe(
			"Flexible amount",
		);
	});

	test("falls back to legacy percentage", () => {
		expect(resolveReminderAmount({ due: 2000, percentage: 75 })).toBe(1500);
	});

	test("normalizes labels for full and custom reminders", () => {
		expect(resolveReminderPlanLabel({ payPlan: "full" })).toBe("Full balance");
		expect(resolveReminderPlanLabel({ percentage: 100 })).toBe("Full balance");
		expect(
			resolveReminderPlanLabel({
				payPlan: "custom",
				preferredAmount: 320,
			}),
		).toBe("Custom amount");
	});
});
