import { describe, expect, it } from "bun:test";
import { triggerMutationQueryEvents } from "./mutation-trigger";
import { publishQueryEvents, subscribeQueryEvents } from "./transport";

describe("mutation query event trigger", () => {
	it("publishes explicit meta.queryEvents after a successful mutation", () => {
		const received: string[] = [];
		const unsubscribe = subscribeQueryEvents((event) => {
			received.push(event.name);
		});

		const triggered = triggerMutationQueryEvents({
			metaEvents: ["jobs.changed"],
			mutationKey: [["unmapped", "mutation"]],
		});

		unsubscribe();
		expect(triggered).toEqual([{ name: "jobs.changed" }]);
		expect(received).toEqual(["jobs.changed"]);
	});

	it("publishes route-derived events without mutation metadata", () => {
		const received: Array<{ name: string; scope: unknown }> = [];
		const unsubscribe = subscribeQueryEvents((event) => {
			received.push({
				name: event.name,
				scope: event.scope,
			});
		});

		const triggered = triggerMutationQueryEvents({
			data: {
				order: {
					id: 44,
					orderId: "08894LM",
					type: "order",
				},
			},
			mutationKey: [["sales", "markLatestPaymentReviewed"]],
		});

		unsubscribe();
		expect(triggered).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
		expect(received).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("merges sale scopes when the same event is published in a batch", async () => {
		const received: unknown[] = [];
		const unsubscribe = subscribeQueryEvents((event) => {
			received.push({
				name: event.name,
				scope: event.scope,
			});
		});

		await publishQueryEvents([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08895LM",
							salesId: 45,
							salesType: "order",
						},
					],
				},
			},
		]);
		unsubscribe();

		expect(received).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
						{
							orderNo: "08895LM",
							salesId: 45,
							salesType: "order",
						},
					],
				},
			},
		]);
	});
});
