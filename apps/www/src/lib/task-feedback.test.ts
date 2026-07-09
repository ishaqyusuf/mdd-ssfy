// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SALES_EMAIL_FAILURE_MESSAGE,
	DEFAULT_TASK_FAILURE_MESSAGE,
	getSalesEmailOutputFailure,
	getTaskFailureMessage,
	getTaskOutputFailureMessage,
	isSalesEmailTaskInput,
	isSalesEmailTaskMetadata,
} from "./task-feedback";

describe("task feedback", () => {
	test("recognizes sales email task inputs", () => {
		expect(isSalesEmailTaskInput({ taskName: "send-sales-email" })).toBe(true);
		expect(
			isSalesEmailTaskInput({
				taskName: "notification",
				payload: { channel: "simple_sales_document_email" },
			}),
		).toBe(true);
		expect(
			isSalesEmailTaskInput({
				taskName: "notification",
				payload: { channel: "composed_sales_document_email" },
			}),
		).toBe(true);
		expect(
			isSalesEmailTaskInput({
				taskName: "notification",
				payload: { channel: "sales_checkout_success" },
			}),
		).toBe(false);
	});

	test("recognizes sales email task metadata", () => {
		expect(isSalesEmailTaskMetadata({ type: "sales-email" })).toBe(true);
		expect(isSalesEmailTaskMetadata({ type: "notification" })).toBe(false);
	});

	test("classifies sales email output failures", () => {
		expect(
			getSalesEmailOutputFailure({ emails: { sent: 0, skipped: 0, failed: 2 } }),
		).toBe("Email provider reported 2 failed messages.");
		expect(
			getSalesEmailOutputFailure({ emails: { sent: 0, skipped: 1, failed: 0 } }),
		).toBe("Email was skipped before it could be sent.");
		expect(
			getSalesEmailOutputFailure({ emails: { sent: 1, skipped: 0, failed: 0 } }),
		).toBe(null);
	});

	test("only applies output failure parsing to sales email tasks", () => {
		expect(
			getTaskOutputFailureMessage({
				metadata: { type: "sales-email" },
				output: { emails: { sent: 0, skipped: 0, failed: 1 } },
			}),
		).toBe("Email provider reported 1 failed message.");
		expect(
			getTaskOutputFailureMessage({
				metadata: { type: "notification" },
				output: { emails: { sent: 0, skipped: 0, failed: 1 } },
			}),
		).toBe(null);
	});

	test("uses specific fallback messages when Trigger does not provide an error", () => {
		expect(
			getTaskFailureMessage({
				input: { taskName: "send-sales-email" },
				errorMessage: null,
			}),
		).toBe(DEFAULT_SALES_EMAIL_FAILURE_MESSAGE);
		expect(getTaskFailureMessage({ errorMessage: null })).toBe(
			DEFAULT_TASK_FAILURE_MESSAGE,
		);
	});
});
