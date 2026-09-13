import { describe, expect, test } from "bun:test";
import {
	hashMailboxProviderAccountIdentity,
	hashMailboxProviderMessageIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
	isExactMailboxProviderIdentity,
} from "./sales-request-mailbox-identities";

describe("Sales Request mailbox storage identities", () => {
	test("creates bounded deterministic lowercase SHA-256 identities", () => {
		for (const identity of [
			hashMailboxProviderAccountIdentity("gmail", "Account-A"),
			hashMailboxProviderSourceIdentity("gmail-label", "INBOX"),
			hashMailboxSourceKey("gmail:label:INBOX"),
			hashMailboxProviderMessageIdentity("microsoft-graph", "Message-A"),
		]) {
			expect(identity).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	test("preserves exact case semantics under case-insensitive database collations", () => {
		expect(
			hashMailboxProviderMessageIdentity("microsoft-graph", "AbC"),
		).not.toBe(hashMailboxProviderMessageIdentity("microsoft-graph", "abc"));
		expect(isExactMailboxProviderIdentity("AbC", "AbC")).toBe(true);
		expect(isExactMailboxProviderIdentity("AbC", "abc")).toBe(false);
	});

	test("separates providers, purposes, and structured parts", () => {
		expect(hashMailboxProviderAccountIdentity("gmail", "same")).not.toBe(
			hashMailboxProviderAccountIdentity("microsoft-graph", "same"),
		);
		expect(hashMailboxProviderAccountIdentity("gmail", "same")).not.toBe(
			hashMailboxProviderMessageIdentity("gmail", "same"),
		);
		expect(hashMailboxProviderSourceIdentity("a", "b:c")).not.toBe(
			hashMailboxProviderSourceIdentity("a:b", "c"),
		);
	});

	test("rejects blank, oversized, or malformed identity parts", () => {
		expect(() => hashMailboxSourceKey(" ")).toThrow(
			"invalid-mailbox-storage-identity",
		);
		expect(() => hashMailboxSourceKey("x".repeat(256))).toThrow(
			"invalid-mailbox-storage-identity",
		);
		expect(() => hashMailboxProviderMessageIdentity("gmail", "a\0b")).toThrow(
			"invalid-mailbox-storage-identity",
		);
	});
});
