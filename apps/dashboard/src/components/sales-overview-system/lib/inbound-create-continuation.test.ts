import { describe, expect, test } from "bun:test";
import {
	inventoryCreateInboundParamForClose,
	inventoryCreateInboundParamForOpen,
	shouldOpenInboundCreateContinuation,
} from "./inbound-create-continuation";

describe("Sales Overview inbound-create continuation", () => {
	test("retains the URL request through open and reload, then clears it on close", () => {
		let requested = true;
		let paneOpen = false;

		expect(shouldOpenInboundCreateContinuation({ requested, paneOpen })).toBe(
			true,
		);

		paneOpen = true;
		requested = inventoryCreateInboundParamForOpen("create_inbound") ?? false;
		expect(requested).toBe(true);
		expect(shouldOpenInboundCreateContinuation({ requested, paneOpen })).toBe(
			false,
		);

		paneOpen = false;
		expect(shouldOpenInboundCreateContinuation({ requested, paneOpen })).toBe(
			true,
		);

		requested = inventoryCreateInboundParamForClose("inbound-create") ?? false;
		expect(requested).toBe(false);
		expect(shouldOpenInboundCreateContinuation({ requested, paneOpen })).toBe(
			false,
		);
	});

	test("does not consume another secondary pane's URL state", () => {
		expect(inventoryCreateInboundParamForClose("payment")).toBeUndefined();
		expect(inventoryCreateInboundParamForOpen("mark_available")).toBeNull();
	});
});
