import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SALES_EMAIL_FAILURE_MESSAGE,
	DEFAULT_TASK_FAILURE_MESSAGE,
	getRunErrorMessage,
	getRunTaskOutputFailureMessage,
	getRunTerminalState,
	getSalesDocumentDeliveryOutputFailure,
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
			getSalesEmailOutputFailure({
				emails: {
					sent: 0,
					skipped: 0,
					failed: 1,
					errorMessage:
						"Email was not sent. The selected sales document is missing a customer email, customer name, or sales rep email.",
				},
			}),
		).toBe(
			"Email was not sent. The selected sales document is missing a customer email, customer name, or sales rep email.",
		);
		expect(
			getSalesEmailOutputFailure({
				emails: { sent: 0, skipped: 0, failed: 2 },
			}),
		).toBe("Email provider reported 2 failed messages.");
		expect(
			getSalesEmailOutputFailure({
				emails: { sent: 0, skipped: 1, failed: 0 },
			}),
		).toBe("Email was skipped before it could be sent.");
		expect(
			getSalesEmailOutputFailure({
				emails: { sent: 1, skipped: 0, failed: 0 },
			}),
		).toBe(null);
	});

	test("classifies requested WhatsApp and SMS outcomes", () => {
		expect(
			getSalesDocumentDeliveryOutputFailure(
				{
					emails: { sent: 0, skipped: 0, failed: 0 },
					whatsapp: { sent: 1, skipped: 0, failed: 0 },
					sms: { sent: 0, skipped: 1, failed: 0 },
				},
				["whatsapp", "sms"],
			),
		).toBe("SMS was skipped before it could be sent.");
		expect(
			getSalesDocumentDeliveryOutputFailure(
				{ errorMessage: "Add a valid customer phone number." },
				["whatsapp"],
			),
		).toBe("Add a valid customer phone number.");
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

	test("reads requested channels from the notification event payload", () => {
		expect(
			getTaskOutputFailureMessage({
				input: {
					taskName: "notification",
					payload: {
						channel: "composed_sales_document_email",
						payload: { channels: ["whatsapp"] },
					},
				},
				output: {
					emails: { sent: 0, skipped: 0, failed: 0 },
					whatsapp: { sent: 0, skipped: 1, failed: 0 },
				},
			}),
		).toBe("WhatsApp was skipped before it could be sent.");
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

	test("extracts hard Trigger run failure state and error messages", () => {
		const run = {
			status: "FAILED",
			isFailed: true,
			error: {
				message: "No eligible sales found for document email",
			},
		};

		expect(getRunTerminalState(run)).toBe("FAILED");
		expect(getRunErrorMessage(run)).toBe(
			"No eligible sales found for document email",
		);
	});

	test("normalizes Trigger status variants", () => {
		expect(getRunTerminalState({ status: "ERRORED" })).toBe("FAILED");
		expect(getRunTerminalState({ status: "CRASHED" })).toBe("FAILED");
		expect(getRunTerminalState({ status: "TIMED_OUT" })).toBe("FAILED");
		expect(getRunTerminalState({ status: "COMPLETED" })).toBe("COMPLETED");
		expect(getRunTerminalState({ status: "CANCELED" })).toBe("CANCELED");
		expect(getRunTerminalState({ status: "EXECUTING" })).toBe(null);
	});

	test("reads output failures from Trigger run snapshots", () => {
		expect(
			getRunTaskOutputFailureMessage({
				metadata: { type: "sales-email" },
				run: { output: { emails: { sent: 0, skipped: 1, failed: 0 } } },
			}),
		).toBe("Email was skipped before it could be sent.");
	});
});
