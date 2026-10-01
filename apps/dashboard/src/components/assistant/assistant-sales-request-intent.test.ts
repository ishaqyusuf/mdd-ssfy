import { expect, test } from "bun:test";
import type { UIMessage } from "ai";
import {
	findAssistantSalesRequestOffer,
	isAssistantSalesRequestConfirmation,
} from "./assistant-sales-request-intent";

const schedule = `Doors Rough Opening
Hallway closet: Double doors 62” x 81” total
(Louvres)
Middle room: 34 x 81 3/4 RH
Middle room closet: 48 x 80 bi-fold
Back room: 32 x 81 3/4 RH
Back room bathroom: 32 x 81 3/4 RH
Middle bath: 32 x 81 3/4 LH
Front room: 32 x 81 3/4 LH
Front room closet: 30 x 81 3/4 LH
Hallway closet: 20 x 81 3/4 RH
Garage steel door: 30 x 82 LH`;

function user(id: string, text: string): UIMessage {
	return { id, role: "user", parts: [{ type: "text", text }] };
}

test("offers the exact pasted rough-opening schedule without converting sizes or merging rooms", () => {
	expect(findAssistantSalesRequestOffer([user("source", schedule)])).toEqual({
		messageId: "source",
		sourceText: schedule,
		type: "order",
	});
});

test("a reload or a sales-confirmation follow-up still uses the original source", () => {
	const messages = [
		user("source", schedule),
		{
			id: "reply",
			role: "assistant" as const,
			parts: [
				{
					type: "text" as const,
					text: "Would you like to create a sales request?",
				},
			],
		},
	];
	expect(findAssistantSalesRequestOffer(messages)?.sourceText).toBe(schedule);
	expect(
		findAssistantSalesRequestOffer([
			...messages,
			user("yes", "Yes, create a sale."),
		])?.sourceText,
	).toBe(schedule);
	expect(
		findAssistantSalesRequestOffer([
			...messages,
			user("confirmation", "Create a sale"),
			user("retry", "yes"),
		])?.sourceText,
	).toBe(schedule);
	expect(
		findAssistantSalesRequestOffer([...messages, user("no", "No thanks")]),
	).toBeNull();
	expect(
		findAssistantSalesRequestOffer([
			...messages,
			user("other", "Find customer Pablo"),
		]),
	).toBeNull();
});

test("offers quote and product lists without intercepting ordinary record questions", () => {
	for (const text of [
		"Please quote three attic access kits",
		"Subject: Quote for doors\n2 doors 30 x 80",
		"Please quote 400 linear feet of WM713 baseboard including 10% waste.",
	]) {
		expect(
			findAssistantSalesRequestOffer([user("source", text)])?.sourceText,
		).toBe(text);
	}
	for (const text of [
		"Hello",
		"What is the status of order 09894PC?",
		"Find the quote for these doors",
		"How many doors did we sell?",
		"Check stock for a 30 x 80 door",
		"Explain rough opening measurements",
	]) {
		expect(findAssistantSalesRequestOffer([user("source", text)])).toBeNull();
	}
	expect(
		findAssistantSalesRequestOffer([
			{
				id: "model",
				role: "assistant",
				parts: [{ type: "text", text: schedule }],
			},
		]),
	).toBeNull();
});

test("only an unambiguous confirmation starts the offered request", () => {
	for (const text of [
		"yes",
		"Yes please!",
		"Yes, create a sales request from that door schedule.",
		"Create a quote",
		"Go ahead",
		"sí",
	])
		expect(isAssistantSalesRequestConfirmation(text)).toBe(true);
	for (const text of [
		"yes but change the garage door to RH",
		"approve the refund",
		"no",
		"what is the price?",
		"yes, pay it",
	])
		expect(isAssistantSalesRequestConfirmation(text)).toBe(false);
});

test("a pasted quotation request retains its quote type on button or yes confirmation", () => {
	const messages = [
		user("source", "Subject: Quote for doors\n2 doors 30 x 80"),
	];
	expect(findAssistantSalesRequestOffer(messages)?.type).toBe("quote");
	expect(
		findAssistantSalesRequestOffer([...messages, user("yes", "yes")])?.type,
	).toBe("quote");
});
