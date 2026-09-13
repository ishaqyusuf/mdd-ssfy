import type {
	MailboxAccountIdentity,
	MailboxMessageDetail,
	MailboxMessageSummary,
	MailboxSyncPage,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "../adapter.js";
import type { MailboxAutomationHeaders } from "../contracts.js";
import { MAILBOX_PROVIDER_AUTHORIZATION } from "../contracts.js";
import { MailboxProviderError } from "../errors.js";

const GRAPH_ORIGIN = "https://graph.microsoft.com";
const GRAPH_ROOT = `${GRAPH_ORIGIN}/v1.0`;
const AUTHORIZE_URL =
	"https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export type MicrosoftGraphFetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;
export type MicrosoftGraphMailboxAdapterConfig = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	fetch?: MicrosoftGraphFetch;
	now?: () => Date;
};

function required(value: string, name: string) {
	const normalized = value.trim();
	if (!normalized) throw new Error(`${name} is required.`);
	return normalized;
}

function graphUrl(value: string) {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	if (
		parsed.origin !== GRAPH_ORIGIN ||
		!parsed.pathname.startsWith("/v1.0/me/") ||
		parsed.username ||
		parsed.password ||
		parsed.hash
	) {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	return parsed.toString();
}

function providerError(status: number, retryAfter: string | null) {
	const retrySeconds = retryAfter ? Number(retryAfter) : Number.NaN;
	if (status === 401) {
		return new MailboxProviderError({
			provider: "microsoft-graph",
			code: "authorization-revoked",
		});
	}
	if (status === 410) {
		return new MailboxProviderError({
			provider: "microsoft-graph",
			code: "cursor-invalid",
		});
	}
	if (status === 404) {
		return new MailboxProviderError({
			provider: "microsoft-graph",
			code: "not-found",
		});
	}
	if (status === 429) {
		return new MailboxProviderError({
			provider: "microsoft-graph",
			code: "rate-limited",
			retryAfterMs: Number.isFinite(retrySeconds)
				? Math.max(0, retrySeconds * 1_000)
				: undefined,
		});
	}
	return new MailboxProviderError({
		provider: "microsoft-graph",
		code: status >= 500 ? "provider-unavailable" : "malformed-response",
	});
}

async function boundedResponseText(response: Response) {
	if (!response.body) return "";
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (true) {
			const result = await reader.read();
			if (result.done) break;
			total += result.value.byteLength;
			if (total > MAX_RESPONSE_BYTES) {
				await reader.cancel();
				throw new MailboxProviderError({
					provider: "microsoft-graph",
					code: "malformed-response",
				});
			}
			chunks.push(result.value);
		}
	} catch (error) {
		if (error instanceof MailboxProviderError) throw error;
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "network",
		});
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}

async function json(
	fetcher: MicrosoftGraphFetch,
	url: string,
	init?: RequestInit,
	authorizationFailureOnBadRequest = false,
) {
	let response: Response;
	try {
		response = await fetcher(url, init);
	} catch {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "network",
		});
	}
	if (!response.ok) {
		if (authorizationFailureOnBadRequest && response.status === 400) {
			throw new MailboxProviderError({
				provider: "microsoft-graph",
				code: "authorization-revoked",
			});
		}
		throw providerError(response.status, response.headers.get("retry-after"));
	}
	const declared = Number(response.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	const text = await boundedResponseText(response);
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
}

function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	return value as Record<string, unknown>;
}

function text(value: unknown, max = 512) {
	return typeof value === "string" && value.trim()
		? value.trim().slice(0, max)
		: undefined;
}

function optionalUrl(value: unknown) {
	if (value == null) return undefined;
	const candidate = text(value, 8_192);
	if (!candidate || candidate.length !== String(value).trim().length) {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	return graphUrl(candidate);
}

function secret(value: unknown) {
	if (typeof value !== "string" || !value.trim() || value.length > 16_384) {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	return value;
}

function hasScope(scopes: readonly string[], requiredScope: string) {
	const suffix = `/${requiredScope.toLowerCase()}`;
	return scopes.some((scope) => {
		const normalized = scope.toLowerCase();
		return (
			normalized === requiredScope.toLowerCase() || normalized.endsWith(suffix)
		);
	});
}

function headers(value: unknown): MailboxAutomationHeaders {
	if (!Array.isArray(value)) return {};
	if (value.length > 100) {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	const selected = new Map<string, string>();
	for (const item of value) {
		const header = record(item);
		const name = text(header.name, 64)?.toLowerCase();
		const value = text(header.value, 512);
		if (name && value) selected.set(name, value);
	}
	return {
		autoSubmitted: selected.get("auto-submitted"),
		autoResponseSuppress: selected.get("x-auto-response-suppress"),
		precedence: selected.get("precedence"),
		listId: selected.get("list-id"),
		loopMarker:
			selected.get("x-loop") ??
			selected.get("x-autoreply") ??
			selected.get("x-autorespond") ??
			undefined,
	};
}

function addresses(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value
		.slice(0, 100)
		.map((item) =>
			text(record(record(item).emailAddress).address, 320)?.toLowerCase(),
		)
		.filter((item): item is string => Boolean(item));
}

function summary(value: unknown): MailboxMessageSummary {
	const item = record(value);
	const from = record(record(item.from).emailAddress);
	const id = text(item.id, 255);
	const fromEmail = text(from.address, 320)?.toLowerCase();
	const receivedAt = new Date(String(item.receivedDateTime ?? ""));
	if (!id || !fromEmail || Number.isNaN(receivedAt.getTime())) {
		throw new MailboxProviderError({
			provider: "microsoft-graph",
			code: "malformed-response",
		});
	}
	return {
		providerMessageId: id,
		providerThreadId: text(item.conversationId, 255),
		folderId: text(item.parentFolderId, 255),
		labelIds: [],
		fromEmail,
		fromName: text(from.name, 255),
		subject: text(item.subject, 998),
		receivedAt,
		hasAttachments: item.hasAttachments === true,
		headers: headers(item.internetMessageHeaders),
	};
}

function bearer(token: string) {
	return { Authorization: `Bearer ${required(token, "accessToken")}` };
}

export class MicrosoftGraphMailboxAdapter
	implements SalesRequestMailboxAdapter
{
	readonly provider = "microsoft-graph" as const;
	readonly #clientId: string;
	readonly #clientSecret: string;
	readonly #redirectUri: string;
	readonly #fetch: MicrosoftGraphFetch;
	readonly #now: () => Date;

	constructor(config: MicrosoftGraphMailboxAdapterConfig) {
		this.#clientId = required(config.clientId, "clientId");
		this.#clientSecret = required(config.clientSecret, "clientSecret");
		this.#redirectUri = required(config.redirectUri, "redirectUri");
		this.#fetch = config.fetch ?? globalThis.fetch;
		this.#now = config.now ?? (() => new Date());
	}

	async createAuthorizationUrl(input: { state: string }) {
		const state = required(input.state, "state");
		if (!/^[A-Za-z0-9_-]{43}$/.test(state)) {
			throw new Error("state must be an opaque 256-bit base64url value.");
		}
		const url = new URL(AUTHORIZE_URL);
		url.search = new URLSearchParams({
			client_id: this.#clientId,
			response_type: "code",
			redirect_uri: this.#redirectUri,
			scope: MAILBOX_PROVIDER_AUTHORIZATION["microsoft-graph"].scopes.join(" "),
			state,
			prompt: "consent",
			response_mode: "query",
		}).toString();
		return url.toString();
	}

	async #token(
		body: URLSearchParams,
		previous?: MailboxTokenSet,
	): Promise<MailboxTokenSet> {
		const value = record(
			await json(
				this.#fetch,
				TOKEN_URL,
				{
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body,
				},
				true,
			),
		);
		const accessToken = secret(value.access_token);
		const expiresIn = Number(value.expires_in);
		if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
			throw new MailboxProviderError({
				provider: "microsoft-graph",
				code: "malformed-response",
			});
		}
		const grantedScopes =
			typeof value.scope === "string"
				? (text(value.scope, 8_192)?.split(/\s+/).filter(Boolean) ?? [])
				: (previous?.grantedScopes ??
					MAILBOX_PROVIDER_AUTHORIZATION["microsoft-graph"].scopes);
		if (
			!hasScope(grantedScopes, "Mail.Read") ||
			!hasScope(grantedScopes, "User.Read")
		) {
			throw new MailboxProviderError({
				provider: "microsoft-graph",
				code: "authorization-revoked",
			});
		}
		return {
			accessToken,
			refreshToken:
				typeof value.refresh_token === "string"
					? secret(value.refresh_token)
					: undefined,
			expiresAt: new Date(this.#now().getTime() + expiresIn * 1_000),
			grantedScopes,
		};
	}

	async exchangeAuthorizationCode(input: { code: string }) {
		const tokens = await this.#token(
			new URLSearchParams({
				client_id: this.#clientId,
				client_secret: this.#clientSecret,
				redirect_uri: this.#redirectUri,
				grant_type: "authorization_code",
				code: required(input.code, "code"),
				scope:
					MAILBOX_PROVIDER_AUTHORIZATION["microsoft-graph"].scopes.join(" "),
			}),
		);
		if (!tokens.refreshToken) {
			throw new MailboxProviderError({
				provider: this.provider,
				code: "authorization-revoked",
			});
		}
		const profile = record(
			await json(
				this.#fetch,
				`${GRAPH_ROOT}/me?$select=id,mail,userPrincipalName,displayName`,
				{ headers: bearer(tokens.accessToken) },
			),
		);
		const providerAccountId = text(profile.id, 255);
		const email = (
			text(profile.mail, 320) ?? text(profile.userPrincipalName, 320)
		)?.toLowerCase();
		if (!providerAccountId || !email) {
			throw new MailboxProviderError({
				provider: "microsoft-graph",
				code: "malformed-response",
			});
		}
		return {
			tokens,
			account: {
				provider: this.provider,
				providerAccountId,
				email,
				displayName: text(profile.displayName, 255),
			} satisfies MailboxAccountIdentity,
		};
	}

	async refreshTokens(input: { tokens: MailboxTokenSet }) {
		const refreshToken = required(
			input.tokens.refreshToken ?? "",
			"refreshToken",
		);
		const refreshed = await this.#token(
			new URLSearchParams({
				client_id: this.#clientId,
				client_secret: this.#clientSecret,
				refresh_token: refreshToken,
				grant_type: "refresh_token",
				scope:
					MAILBOX_PROVIDER_AUTHORIZATION["microsoft-graph"].scopes.join(" "),
			}),
			input.tokens,
		);
		return {
			...refreshed,
			refreshToken: refreshed.refreshToken ?? refreshToken,
		};
	}

	async revoke(_input: { tokens: MailboxTokenSet }) {
		// Graph has no least-privilege single-token revocation endpoint for these scopes.
		// Disconnect deletes GND's encrypted credentials; never revoke all user sessions.
	}

	async listMessages(input: {
		tokens: MailboxTokenSet;
		cursor?: string;
		pageToken?: string;
		folderId?: string;
		labelId?: string;
		since: Date | null;
		fullSync: boolean;
		limit: number;
	}): Promise<MailboxSyncPage> {
		if (
			!Number.isSafeInteger(input.limit) ||
			input.limit < 1 ||
			input.limit > 50
		) {
			throw new MailboxProviderError({
				provider: this.provider,
				code: "malformed-response",
			});
		}
		let url: string;
		if (input.pageToken) url = graphUrl(input.pageToken);
		else if (input.cursor && !input.fullSync) url = graphUrl(input.cursor);
		else {
			if (!input.since) {
				throw new MailboxProviderError({
					provider: this.provider,
					code: "malformed-response",
				});
			}
			if (
				Number.isNaN(input.since.getTime()) ||
				input.since.getTime() > this.#now().getTime() + 5 * 60_000
			) {
				throw new MailboxProviderError({
					provider: this.provider,
					code: "malformed-response",
				});
			}
			const folderId = encodeURIComponent(input.folderId?.trim() || "inbox");
			const initial = new URL(
				`${GRAPH_ROOT}/me/mailFolders/${folderId}/messages/delta`,
			);
			initial.searchParams.set(
				"$top",
				String(Math.max(1, Math.min(input.limit, 50))),
			);
			initial.searchParams.set(
				"$select",
				"id,conversationId,parentFolderId,from,subject,receivedDateTime,hasAttachments,internetMessageHeaders",
			);
			initial.searchParams.set(
				"$filter",
				`receivedDateTime ge ${input.since.toISOString()}`,
			);
			url = initial.toString();
		}
		const value = record(
			await json(this.#fetch, url, {
				headers: bearer(input.tokens.accessToken),
			}),
		);
		if (!Array.isArray(value.value)) {
			throw new MailboxProviderError({
				provider: this.provider,
				code: "malformed-response",
			});
		}
		if (value.value.length > input.limit) {
			throw new MailboxProviderError({
				provider: this.provider,
				code: "malformed-response",
			});
		}
		const messages: MailboxMessageSummary[] = [];
		const removedProviderMessageIds: string[] = [];
		for (const item of value.value) {
			const candidate = record(item);
			if (candidate["@removed"]) {
				const id = text(candidate.id, 255);
				if (!id) {
					throw new MailboxProviderError({
						provider: this.provider,
						code: "malformed-response",
					});
				}
				removedProviderMessageIds.push(id);
			} else {
				messages.push(summary(candidate));
			}
		}
		const nextPageToken = optionalUrl(value["@odata.nextLink"]);
		const nextCursor = optionalUrl(value["@odata.deltaLink"]);
		if (Boolean(nextPageToken) === Boolean(nextCursor)) {
			throw new MailboxProviderError({
				provider: this.provider,
				code: "malformed-response",
			});
		}
		return {
			messages,
			removedProviderMessageIds,
			nextPageToken,
			nextCursor,
			cursorInvalid: false,
		};
	}

	async getMessage(input: {
		tokens: MailboxTokenSet;
		providerMessageId: string;
	}): Promise<MailboxMessageDetail> {
		const requestedId = required(input.providerMessageId, "providerMessageId");
		const id = encodeURIComponent(requestedId);
		const url = `${GRAPH_ROOT}/me/messages/${id}?$select=id,conversationId,parentFolderId,from,subject,receivedDateTime,hasAttachments,internetMessageHeaders,body,toRecipients,ccRecipients`;
		const value = record(
			await json(this.#fetch, url, {
				headers: bearer(input.tokens.accessToken),
			}),
		);
		const base = summary(value);
		if (base.providerMessageId !== requestedId) {
			throw new MailboxProviderError({
				provider: this.provider,
				code: "malformed-response",
			});
		}
		const body = record(value.body);
		const content = text(body.content, 200_000);
		const contentType = text(body.contentType, 20)?.toLowerCase();
		return {
			...base,
			textBody: contentType === "text" ? content : undefined,
			htmlBody: contentType === "html" ? content : undefined,
			toEmails: addresses(value.toRecipients),
			ccEmails: addresses(value.ccRecipients),
		};
	}
}
