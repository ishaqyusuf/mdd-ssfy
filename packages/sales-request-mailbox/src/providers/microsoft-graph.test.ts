import { describe, expect, test } from "bun:test";
import { MailboxProviderError } from "../errors";
import {
	type MicrosoftGraphFetch,
	MicrosoftGraphMailboxAdapter,
} from "./microsoft-graph";

const tokens = {
	accessToken: "access",
	refreshToken: "refresh",
	grantedScopes: ["Mail.Read", "User.Read"],
};

function adapter(fetch: MicrosoftGraphFetch) {
	return new MicrosoftGraphMailboxAdapter({
		clientId: "client",
		clientSecret: "secret",
		redirectUri: "https://app.example/api/mailbox/microsoft/callback",
		fetch,
		now: () => new Date("2026-09-13T12:00:00.000Z"),
	});
}

describe("Microsoft Graph mailbox adapter", () => {
	test("creates read-only authorization URLs", async () => {
		const url = new URL(
			await adapter(globalThis.fetch).createAuthorizationUrl({
				state: "a".repeat(43),
			}),
		);
		expect(url.origin).toBe("https://login.microsoftonline.com");
		expect(url.searchParams.get("scope")).toContain("Mail.Read");
		expect(url.searchParams.get("scope")).not.toMatch(
			/Mail\.Send|Mail\.ReadWrite/,
		);
		expect(url.searchParams.get("state")).toBe("a".repeat(43));
	});

	test("preserves a refresh token when Microsoft does not rotate it", async () => {
		const fetch = (async () =>
			Response.json({
				access_token: "new-access",
				expires_in: 3600,
				scope: "Mail.Read User.Read",
			})) satisfies MicrosoftGraphFetch;
		const result = await adapter(fetch).refreshTokens({ tokens });
		expect(result.refreshToken).toBe("refresh");
	});

	test("exchanges a code and derives provider-owned account identity", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(url), init });
			return calls.length === 1
				? Response.json({
						access_token: "new-access",
						refresh_token: "new-refresh",
						expires_in: 3600,
					})
				: Response.json({
						id: "account-1",
						mail: "Sales@Example.com",
						displayName: "Sales Desk",
					});
		}) satisfies MicrosoftGraphFetch;
		const result = await adapter(fetch).exchangeAuthorizationCode({
			code: "code",
		});
		expect(result.account).toEqual({
			provider: "microsoft-graph",
			providerAccountId: "account-1",
			email: "sales@example.com",
			displayName: "Sales Desk",
		});
		expect(result.tokens.expiresAt?.toISOString()).toBe(
			"2026-09-13T13:00:00.000Z",
		);
		expect(String(calls[0]?.init?.body)).toContain(
			"grant_type=authorization_code",
		);
		expect(result.tokens.grantedScopes).toEqual([
			"offline_access",
			"User.Read",
			"Mail.Read",
		]);
	});

	test("rejects an explicitly reduced token scope", async () => {
		const fetch = (async () =>
			Response.json({
				access_token: "new-access",
				refresh_token: "new-refresh",
				expires_in: 3600,
				scope: "User.Read",
			})) satisfies MicrosoftGraphFetch;
		await expect(
			adapter(fetch).exchangeAuthorizationCode({ code: "code" }),
		).rejects.toMatchObject({ code: "authorization-revoked" });
	});

	test("maps a delta page and message detail without loading remote HTML", async () => {
		const fetch = (async (url: string | URL | Request) => {
			if (String(url).includes("/messages/m1?")) {
				return Response.json({
					id: "m1",
					conversationId: "thread-1",
					parentFolderId: "inbox",
					from: {
						emailAddress: { address: "buyer@example.com", name: "Buyer" },
					},
					subject: "Door quote",
					receivedDateTime: "2026-09-13T10:00:00.000Z",
					hasAttachments: false,
					internetMessageHeaders: [
						{ name: "Auto-Submitted", value: "no" },
						{ name: "X-Loop", value: "sales@example.com" },
					],
					body: {
						contentType: "html",
						content: '<p>Need a door</p><img src="https://tracker">',
					},
					toRecipients: [{ emailAddress: { address: "sales@example.com" } }],
					ccRecipients: [],
				});
			}
			return Response.json({
				value: [
					{
						id: "m1",
						conversationId: "thread-1",
						parentFolderId: "inbox",
						from: { emailAddress: { address: "buyer@example.com" } },
						receivedDateTime: "2026-09-13T10:00:00.000Z",
						hasAttachments: false,
						internetMessageHeaders: [],
					},
					{ id: "removed-1", "@removed": { reason: "deleted" } },
				],
				"@odata.deltaLink":
					"https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=private",
			});
		}) satisfies MicrosoftGraphFetch;
		const client = adapter(fetch);
		const page = await client.listMessages({
			tokens,
			since: new Date("2026-09-01T00:00:00.000Z"),
			fullSync: true,
			limit: 50,
		});
		expect(page.messages[0]).toMatchObject({
			providerMessageId: "m1",
			fromEmail: "buyer@example.com",
		});
		expect(page.nextCursor).toContain("deltatoken=private");
		expect(page.removedProviderMessageIds).toEqual(["removed-1"]);
		const detail = await client.getMessage({ tokens, providerMessageId: "m1" });
		expect(detail.htmlBody).toContain("Need a door");
		expect(detail.toEmails).toEqual(["sales@example.com"]);
		expect(detail.headers.loopMarker).toBe("sales@example.com");
	});

	test("rejects a getMessage response whose provider identity changed", async () => {
		const fetch = (async () =>
			Response.json({
				id: "different-message",
				from: { emailAddress: { address: "buyer@example.com" } },
				receivedDateTime: "2026-09-13T10:00:00.000Z",
				hasAttachments: false,
				internetMessageHeaders: [],
				body: { contentType: "text", content: "Need a door" },
				toRecipients: [],
				ccRecipients: [],
			})) satisfies MicrosoftGraphFetch;
		await expect(
			adapter(fetch).getMessage({
				tokens,
				providerMessageId: "expected-message",
			}),
		).rejects.toMatchObject({ code: "malformed-response" });
	});

	test("rejects a delta page without exactly one continuation", async () => {
		const fetch = (async () =>
			Response.json({ value: [] })) satisfies MicrosoftGraphFetch;
		await expect(
			adapter(fetch).listMessages({
				tokens,
				since: new Date("2026-09-01T00:00:00.000Z"),
				fullSync: true,
				limit: 50,
			}),
		).rejects.toMatchObject({ code: "malformed-response" });
	});

	test("cancels a chunked provider response at the byte ceiling", async () => {
		let cancelled = false;
		let emitted = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				emitted += 1;
				controller.enqueue(new Uint8Array(1024 * 1024));
			},
			cancel() {
				cancelled = true;
			},
		});
		const fetch = (async () =>
			new Response(body)) satisfies MicrosoftGraphFetch;
		await expect(
			adapter(fetch).refreshTokens({ tokens }),
		).rejects.toMatchObject({
			code: "malformed-response",
		});
		expect(cancelled).toBe(true);
	});

	test("rejects attacker-controlled cursor origins before fetch", async () => {
		let called = false;
		const fetch = (async () => {
			called = true;
			return Response.json({});
		}) satisfies MicrosoftGraphFetch;
		await expect(
			adapter(fetch).listMessages({
				tokens,
				cursor: "https://evil.example/steal",
				since: new Date("2026-09-01T00:00:00.000Z"),
				fullSync: false,
				limit: 50,
			}),
		).rejects.toBeInstanceOf(MailboxProviderError);
		expect(called).toBe(false);
	});

	test("maps authorization, cursor, rate, and network failures", async () => {
		for (const [status, code] of [
			[401, "authorization-revoked"],
			[404, "not-found"],
			[410, "cursor-invalid"],
			[429, "rate-limited"],
		] as const) {
			const fetch = (async () =>
				new Response("private", {
					status,
					headers: status === 429 ? { "Retry-After": "10" } : undefined,
				})) satisfies MicrosoftGraphFetch;
			await expect(
				adapter(fetch).listMessages({
					tokens,
					cursor:
						"https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=x",
					since: new Date("2026-09-01T00:00:00.000Z"),
					fullSync: false,
					limit: 50,
				}),
			).rejects.toMatchObject({ code });
		}
		const network = (async () => {
			throw new Error("private socket detail");
		}) satisfies MicrosoftGraphFetch;
		await expect(
			adapter(network).refreshTokens({ tokens }),
		).rejects.toMatchObject({
			code: "network",
			message: "Mailbox provider operation failed",
		});
	});
});
