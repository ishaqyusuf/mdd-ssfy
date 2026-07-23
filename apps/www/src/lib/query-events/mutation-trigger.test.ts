import { describe, expect, it } from "bun:test";
import { triggerMutationQueryEvents } from "./mutation-trigger";
import { publishQueryEvents, subscribeQueryEvents } from "./transport";

describe("mutation query event trigger", () => {
	it("waits for local query invalidation listeners before completing", async () => {
		let releaseListener: (() => void) | undefined;
		let listenerCompleted = false;
		const listenerGate = new Promise<void>((resolve) => {
			releaseListener = resolve;
		});
		const unsubscribe = subscribeQueryEvents(async () => {
			await listenerGate;
			listenerCompleted = true;
		});

		const completion = triggerMutationQueryEvents({
			mutationKey: [["customers", "createCustomer"]],
		});

		expect(listenerCompleted).toBe(false);

		releaseListener?.();
		const triggered = await completion;
		await Promise.resolve();
		unsubscribe();

		expect(completion).toBeInstanceOf(Promise);
		expect(triggered).toEqual([{ name: "customer.changed" }]);
		expect(listenerCompleted).toBe(true);
	});

	it("publishes explicit meta.queryEvents after a successful mutation", async () => {
		const received: string[] = [];
		const unsubscribe = subscribeQueryEvents((event) => {
			received.push(event.name);
		});

		const triggered = await triggerMutationQueryEvents({
			metaEvents: ["jobs.changed"],
			mutationKey: [["unmapped", "mutation"]],
		});

		unsubscribe();
		expect(triggered).toEqual([{ name: "jobs.changed" }]);
		expect(received).toEqual(["jobs.changed"]);
	});

	it("publishes route-derived events without mutation metadata", async () => {
		const received: Array<{ name: string; scope: unknown }> = [];
		const unsubscribe = subscribeQueryEvents((event) => {
			received.push({
				name: event.name,
				scope: event.scope,
			});
		});

		const triggered = await triggerMutationQueryEvents({
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
