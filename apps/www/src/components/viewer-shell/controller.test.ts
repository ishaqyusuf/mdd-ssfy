// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	closeViewerShell,
	openViewerShell,
	subscribeViewerShell,
} from "./controller";

describe("viewer shell controller", () => {
	it("returns false when no provider is subscribed", () => {
		expect(
			openViewerShell({
				title: "Preview",
				content: "Content",
			}),
		).toBe(false);
	});

	it("notifies subscribers about open and close events", () => {
		const events: string[] = [];
		const unsubscribe = subscribeViewerShell((event) => {
			events.push(event.type);
		});

		expect(
			openViewerShell({
				title: "Preview",
				content: "Content",
			}),
		).toBe(true);
		closeViewerShell();
		unsubscribe();

		expect(events).toEqual(["open", "close"]);
	});

	it("stops notifying unsubscribed listeners", () => {
		let calls = 0;
		const unsubscribe = subscribeViewerShell(() => {
			calls += 1;
		});

		unsubscribe();
		openViewerShell({
			title: "Preview",
			content: "Content",
		});

		expect(calls).toBe(0);
	});
});
