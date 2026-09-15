import { describe, expect, test } from "bun:test";
import { getSalesRequestMailboxDraftPath } from "./sales-request-mailbox-route";

describe("Sales Request mailbox draft routes", () => {
	test("selects the form route from the preview mutation type", () => {
		expect(getSalesRequestMailboxDraftPath("quote")).toBe(
			"/sales-form/create-quote",
		);
		expect(getSalesRequestMailboxDraftPath("order")).toBe(
			"/sales-form/create-order",
		);
	});
});
