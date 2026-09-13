import { describe, expect, test } from "bun:test";
import { MailboxProviderError } from "../errors";
import {
	type GmailMailboxAdapterConfig,
	GmailSalesRequestMailboxAdapter,
} from "./gmail";

const NOW = new Date("2026-09-13T12:00:00.000Z");

type FixtureCall = {
	request: Request;
	body: string;
};

function json(value: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(value), {
		status: 200,
		headers: { "content-type": "application/json" },
		...init,
	});
}

function fixtureAdapter(
	handler: (call: FixtureCall, index: number) => Response | Promise<Response>,
) {
	const calls: FixtureCall[] = [];
	const fetch = Object.assign(
		async (input: string | URL | Request, init?: BunFetchRequestInit) => {
			const request = new Request(input, init);
			const call = { request, body: await request.clone().text() };
			calls.push(call);
			return handler(call, calls.length - 1);
		},
		{ preconnect: () => undefined },
	);
	const config: GmailMailboxAdapterConfig = {
		clientId: "gmail-client",
		clientSecret: "gmail-secret",
		redirectUri: "https://app.example.com/oauth/gmail/callback",
		fetch,
		now: () => NOW,
	};
	return { adapter: new GmailSalesRequestMailboxAdapter(config), calls };
}

function metadataMessage(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		threadId: `thread-${id}`,
		labelIds: ["INBOX", "Label_sales"],
		internalDate: String(NOW.getTime()),
		historyId: "901",
		payload: {
			mimeType: "multipart/mixed",
			headers: [
				{ name: "From", value: "Acme Buyer <BUYER@example.com>" },
				{ name: "Subject", value: `Request ${id}` },
				{ name: "Auto-Submitted", value: "no" },
				{ name: "X-Auto-Response-Suppress", value: "OOF" },
				{ name: "Precedence", value: "bulk" },
				{ name: "List-Id", value: "sales.example.com" },
				{ name: "X-Loop", value: "loop@example.com" },
			],
			parts: [
				{
					mimeType: "application/pdf",
					filename: "request.pdf",
					body: { attachmentId: "attachment-1", size: 100 },
				},
			],
		},
		...overrides,
	};
}

describe("GmailSalesRequestMailboxAdapter", () => {
	test("creates a state-bound authorization URL with only read-only scopes", async () => {
		const { adapter, calls } = fixtureAdapter(() => json({}));
		const value = new URL(
			await adapter.createAuthorizationUrl({ state: "a".repeat(43) }),
		);

		expect(calls).toHaveLength(0);
		expect(value.origin + value.pathname).toBe(
			"https://accounts.google.com/o/oauth2/v2/auth",
		);
		expect(value.searchParams.get("client_id")).toBe("gmail-client");
		expect(value.searchParams.get("redirect_uri")).toBe(
			"https://app.example.com/oauth/gmail/callback",
		);
		expect(value.searchParams.get("state")).toBe("a".repeat(43));
		expect(value.searchParams.get("response_type")).toBe("code");
		expect(value.searchParams.get("access_type")).toBe("offline");
		expect(value.searchParams.get("prompt")).toBe("consent");
		expect(value.searchParams.get("scope")?.split(" ").sort()).toEqual([
			"https://www.googleapis.com/auth/gmail.readonly",
			"https://www.googleapis.com/auth/userinfo.email",
		]);
	});

	test("exchanges a code and resolves the immutable provider account identity", async () => {
		const { adapter, calls } = fixtureAdapter(({ request }, index) => {
			if (index === 0) {
				expect(request.url).toBe("https://oauth2.googleapis.com/token");
				return json({
					access_token: "access-1",
					refresh_token: "refresh-1",
					expires_in: 3600,
					scope:
						"https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
					token_type: "Bearer",
				});
			}
			expect(request.url).toBe("https://www.googleapis.com/oauth2/v2/userinfo");
			expect(request.headers.get("authorization")).toBe("Bearer access-1");
			return json({
				id: "google-account-1",
				email: "OWNER@Example.com",
				name: "Mailbox Owner",
			});
		});

		const result = await adapter.exchangeAuthorizationCode({ code: "code-1" });
		const tokenBody = new URLSearchParams(calls[0]?.body);

		expect(tokenBody.get("grant_type")).toBe("authorization_code");
		expect(tokenBody.get("client_id")).toBe("gmail-client");
		expect(tokenBody.get("client_secret")).toBe("gmail-secret");
		expect(tokenBody.get("redirect_uri")).toBe(
			"https://app.example.com/oauth/gmail/callback",
		);
		expect(tokenBody.get("code")).toBe("code-1");
		expect(result).toEqual({
			tokens: {
				accessToken: "access-1",
				refreshToken: "refresh-1",
				expiresAt: new Date("2026-09-13T13:00:00.000Z"),
				grantedScopes: [
					"https://www.googleapis.com/auth/gmail.readonly",
					"https://www.googleapis.com/auth/userinfo.email",
				],
			},
			account: {
				provider: "gmail",
				providerAccountId: "google-account-1",
				email: "owner@example.com",
				displayName: "Mailbox Owner",
			},
		});
	});

	test("refreshes without discarding a rotated credential and revokes it", async () => {
		const { adapter, calls } = fixtureAdapter(({ request }, index) => {
			if (index === 0) {
				return json({ access_token: "access-2", expires_in: 1800 });
			}
			expect(request.url).toBe("https://oauth2.googleapis.com/revoke");
			return new Response(null, { status: 200 });
		});
		const tokens = {
			accessToken: "access-1",
			refreshToken: "refresh-1",
			expiresAt: NOW,
			grantedScopes: ["scope-a"] as const,
		};

		const refreshed = await adapter.refreshTokens({ tokens });
		await adapter.revoke({ tokens: refreshed });

		expect(new URLSearchParams(calls[0]?.body).get("grant_type")).toBe(
			"refresh_token",
		);
		expect(new URLSearchParams(calls[0]?.body).get("refresh_token")).toBe(
			"refresh-1",
		);
		expect(refreshed).toEqual({
			accessToken: "access-2",
			refreshToken: "refresh-1",
			expiresAt: new Date("2026-09-13T12:30:00.000Z"),
			grantedScopes: ["scope-a"],
		});
		expect(new URLSearchParams(calls[1]?.body).get("token")).toBe("refresh-1");
	});

	test("lists a full-sync page, fetches bounded metadata, and carries the snapshot cursor opaquely", async () => {
		let listPage = 0;
		const { adapter, calls } = fixtureAdapter(({ request }) => {
			const url = new URL(request.url);
			if (url.pathname.endsWith("/profile")) {
				return json({ emailAddress: "owner@example.com", historyId: "900" });
			}
			if (url.pathname.endsWith("/messages")) {
				listPage += 1;
				return listPage === 1
					? json({
							messages: [{ id: "m1" }, { id: "m2" }],
							nextPageToken: "provider-page-2",
						})
					: json({ messages: [{ id: "m3" }] });
			}
			const id = url.pathname.split("/").at(-1);
			return json(metadataMessage(id ?? "missing"));
		});
		const tokens = {
			accessToken: "access-1",
			grantedScopes: [] as const,
		};

		const first = await adapter.listMessages({
			tokens,
			since: new Date("2026-09-01T00:00:00.000Z"),
			fullSync: true,
			limit: 2,
		});

		expect(first.cursorInvalid).toBe(false);
		expect(first.messages.map((message) => message.providerMessageId)).toEqual([
			"m1",
			"m2",
		]);
		expect(first.nextCursor).toBeUndefined();
		expect(first.nextPageToken).toStartWith("gmail-page-v1.");
		expect(first.messages[0]).toMatchObject({
			providerThreadId: "thread-m1",
			fromEmail: "buyer@example.com",
			fromName: "Acme Buyer",
			subject: "Request m1",
			hasAttachments: true,
			headers: {
				autoSubmitted: "no",
				autoResponseSuppress: "OOF",
				precedence: "bulk",
				listId: "sales.example.com",
				loopMarker: "loop@example.com",
			},
		});

		const second = await adapter.listMessages({
			tokens,
			pageToken: first.nextPageToken,
			since: new Date("2026-09-01T00:00:00.000Z"),
			fullSync: true,
			limit: 2,
		});
		expect(second.nextPageToken).toBeUndefined();
		expect(second.nextCursor).toBe("900");
		expect(second.messages).toHaveLength(1);

		const listCalls = calls.filter((call) =>
			new URL(call.request.url).pathname.endsWith("/messages"),
		);
		expect(listCalls).toHaveLength(2);
		const [firstListCall, secondListCall] = listCalls;
		if (!firstListCall || !secondListCall)
			throw new Error("Expected list calls");
		expect(new URL(firstListCall.request.url).searchParams.get("q")).toBe(
			"after:1788220800",
		);
		expect(
			new URL(secondListCall.request.url).searchParams.get("pageToken"),
		).toBe("provider-page-2");
	});

	test("lists incremental message additions with deduplication and a final history cursor", async () => {
		let historyPage = 0;
		const { adapter, calls } = fixtureAdapter(({ request }) => {
			const url = new URL(request.url);
			if (url.pathname.endsWith("/history")) {
				historyPage += 1;
				return historyPage === 1
					? json({
							history: [
								{ messagesAdded: [{ message: { id: "m1" } }] },
								{
									messagesAdded: [
										{ message: { id: "m1" } },
										{ message: { id: "m2" } },
									],
								},
							],
							historyId: "902",
							nextPageToken: "history-page-2",
						})
					: json({ history: [], historyId: "903" });
			}
			const id = url.pathname.split("/").at(-1);
			return json(metadataMessage(id ?? "missing"));
		});
		const input = {
			tokens: { accessToken: "access-1", grantedScopes: [] as const },
			cursor: "900",
			since: null,
			fullSync: false,
			limit: 2,
		};

		const first = await adapter.listMessages(input);
		expect(first.messages.map((message) => message.providerMessageId)).toEqual([
			"m1",
			"m2",
		]);
		expect(first.nextCursor).toBeUndefined();
		expect(first.nextPageToken).toStartWith("gmail-page-v1.");

		const second = await adapter.listMessages({
			...input,
			pageToken: first.nextPageToken,
		});
		expect(second).toEqual({
			messages: [],
			removedProviderMessageIds: [],
			nextCursor: "903",
			cursorInvalid: false,
		});

		const historyCalls = calls.filter((call) =>
			new URL(call.request.url).pathname.endsWith("/history"),
		);
		expect(historyCalls).toHaveLength(2);
		const [firstHistoryCall, secondHistoryCall] = historyCalls;
		if (!firstHistoryCall || !secondHistoryCall) {
			throw new Error("Expected history calls");
		}
		const firstUrl = new URL(firstHistoryCall.request.url);
		expect(firstUrl.searchParams.get("startHistoryId")).toBe("900");
		expect(firstUrl.searchParams.getAll("historyTypes")).toEqual([
			"messageAdded",
			"messageDeleted",
			"labelAdded",
			"labelRemoved",
		]);
		expect(
			new URL(secondHistoryCall.request.url).searchParams.get("pageToken"),
		).toBe("history-page-2");
	});

	test("returns Gmail deletion and monitored-label removal tombstones", async () => {
		const { adapter } = fixtureAdapter(({ request }) => {
			const url = new URL(request.url);
			if (url.pathname.endsWith("/history")) {
				return json({
					history: [
						{ messagesDeleted: [{ message: { id: "m1" } }] },
						{
							labelsRemoved: [{ message: { id: "m2" }, labelIds: ["Orders"] }],
						},
						{
							labelsAdded: [{ message: { id: "m3" }, labelIds: ["Orders"] }],
						},
					],
					historyId: "904",
				});
			}
			return json(metadataMessage(url.pathname.split("/").at(-1) ?? "missing"));
		});
		const result = await adapter.listMessages({
			tokens: { accessToken: "access-1", grantedScopes: [] },
			cursor: "903",
			labelId: "Orders",
			since: null,
			fullSync: false,
			limit: 3,
		});
		expect(result.removedProviderMessageIds).toEqual(["m1", "m2"]);
		expect(result.messages.map((message) => message.providerMessageId)).toEqual(
			["m3"],
		);
	});

	test("turns a list-to-metadata disappearance into a tombstone", async () => {
		const { adapter } = fixtureAdapter(({ request }) => {
			const url = new URL(request.url);
			if (url.pathname.endsWith("/profile")) return json({ historyId: "905" });
			if (url.pathname.endsWith("/messages")) {
				return json({ messages: [{ id: "m1" }] });
			}
			return json({ error: { message: "gone" } }, { status: 404 });
		});
		const result = await adapter.listMessages({
			tokens: { accessToken: "access-1", grantedScopes: [] },
			since: new Date("2026-09-01T00:00:00.000Z"),
			fullSync: true,
			limit: 1,
		});
		expect(result.messages).toEqual([]);
		expect(result.removedProviderMessageIds).toEqual(["m1"]);
		expect(result.nextCursor).toBe("905");
	});

	test("parses bounded nested MIME text and fetches detached text bodies only", async () => {
		const text = Buffer.from("Please quote 40 doors.").toString("base64url");
		const html = Buffer.from("<p>Please quote <b>40 doors</b>.</p>").toString(
			"base64url",
		);
		const { adapter, calls } = fixtureAdapter(({ request }) => {
			const url = new URL(request.url);
			if (url.pathname.includes("/attachments/html-body")) {
				return json({ data: html, size: 37 });
			}
			return json(
				metadataMessage("m1", {
					payload: {
						mimeType: "multipart/mixed",
						headers: [
							{ name: "From", value: '"Buyer, Ada" <ADA@Example.com>' },
							{
								name: "To",
								value: "Sales <sales@example.com>, ops@example.com",
							},
							{ name: "Cc", value: "Buyer Two <two@example.com>" },
							{ name: "Subject", value: "Door request" },
						],
						parts: [
							{
								mimeType: "multipart/alternative",
								parts: [
									{ mimeType: "text/plain", body: { data: text, size: 22 } },
									{
										mimeType: "text/html",
										body: { attachmentId: "html-body", size: 37 },
									},
								],
							},
							{
								mimeType: "application/pdf",
								filename: "request.pdf",
								body: { attachmentId: "pdf-body", size: 100 },
							},
						],
					},
				}),
			);
		});

		const message = await adapter.getMessage({
			tokens: { accessToken: "access-1", grantedScopes: [] },
			providerMessageId: "m1",
		});

		expect(message).toMatchObject({
			providerMessageId: "m1",
			fromEmail: "ada@example.com",
			fromName: "Buyer, Ada",
			subject: "Door request",
			toEmails: ["sales@example.com", "ops@example.com"],
			ccEmails: ["two@example.com"],
			textBody: "Please quote 40 doors.",
			htmlBody: "<p>Please quote <b>40 doors</b>.</p>",
			hasAttachments: true,
		});
		expect(calls.some((call) => call.request.url.includes("pdf-body"))).toBe(
			false,
		);
	});

	test("maps cursor, authorization, rate-limit, network, and malformed responses without provider payloads", async () => {
		const cases = [
			{
				response: json(
					{ error: { message: "SECRET history detail" } },
					{ status: 404 },
				),
				code: "cursor-invalid",
			},
			{
				response: json(
					{ error: { message: "SECRET token detail" } },
					{ status: 401 },
				),
				code: "authorization-revoked",
			},
			{
				response: json(
					{ error: { message: "SECRET quota detail" } },
					{ status: 429, headers: { "retry-after": "12" } },
				),
				code: "rate-limited",
				retryAfterMs: 12_000,
			},
		] as const;

		for (const fixture of cases) {
			const { adapter } = fixtureAdapter(() => fixture.response.clone());
			try {
				await adapter.listMessages({
					tokens: { accessToken: "access-1", grantedScopes: [] },
					cursor: "900",
					since: null,
					fullSync: false,
					limit: 1,
				});
				throw new Error("Expected provider error");
			} catch (error) {
				expect(error).toBeInstanceOf(MailboxProviderError);
				expect(error).toMatchObject({
					code: fixture.code,
					provider: "gmail",
					...("retryAfterMs" in fixture
						? { retryAfterMs: fixture.retryAfterMs }
						: {}),
				});
				expect(String(error)).not.toContain("SECRET");
				expect(JSON.stringify(error)).not.toContain("SECRET");
			}
		}

		const network = fixtureAdapter(() => {
			throw new TypeError("SECRET socket detail");
		}).adapter;
		await expect(
			network.listMessages({
				tokens: { accessToken: "access-1", grantedScopes: [] },
				cursor: "900",
				since: null,
				fullSync: false,
				limit: 1,
			}),
		).rejects.toMatchObject({ code: "network", provider: "gmail" });

		const malformed = fixtureAdapter(() =>
			json({ messages: [{ id: "\n" }] }),
		).adapter;
		await expect(
			malformed.listMessages({
				tokens: { accessToken: "access-1", grantedScopes: [] },
				since: NOW,
				fullSync: true,
				limit: 1,
			}),
		).rejects.toMatchObject({ code: "malformed-response", provider: "gmail" });
	});
});
