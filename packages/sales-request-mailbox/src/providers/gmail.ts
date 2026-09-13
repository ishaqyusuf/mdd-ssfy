import type {
	MailboxMessageDetail,
	MailboxMessageSummary,
	MailboxSyncPage,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "../adapter.js";
import { MAILBOX_PROVIDER_AUTHORIZATION } from "../contracts.js";
import { MailboxProviderError } from "../errors.js";

const PROVIDER = "gmail" as const;
const AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const API_ROOT = "https://gmail.googleapis.com/gmail/v1/users/me";
const PAGE_TOKEN_PREFIX = "gmail-page-v1.";

const MAX_ERROR_BYTES = 64 * 1024;
const MAX_PROFILE_BYTES = 64 * 1024;
const MAX_LIST_BYTES = 1024 * 1024;
const MAX_METADATA_BYTES = 256 * 1024;
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024;
const MAX_BODY_BYTES = 512 * 1024;
const MAX_HEADERS = 256;
const MAX_HEADER_NAME_BYTES = 128;
const MAX_HEADER_VALUE_BYTES = 8 * 1024;
const MAX_PARTS = 256;
const MAX_MIME_DEPTH = 20;
const MAX_LABELS = 100;
const MAX_ADDRESSES = 100;
const MAX_TOKEN_BYTES = 16 * 1024;
const MAX_PAGE_TOKEN_BYTES = 8 * 1024;
const MAX_PROVIDER_PAGE_TOKEN_BYTES = 4 * 1024;
const MAX_MESSAGE_ID_BYTES = 255;
const MAX_CURSOR_BYTES = 64;
const MAX_SUBJECT_BYTES = 2 * 1024;
const MAX_AUTOMATION_HEADER_BYTES = 512;

const SUMMARY_HEADERS = [
	"From",
	"Subject",
	"Date",
	"Auto-Submitted",
	"X-Auto-Response-Suppress",
	"Precedence",
	"List-Id",
	"X-Loop",
	"X-Autoreply",
	"X-Autorespond",
] as const;

const REQUIRED_SCOPES = MAILBOX_PROVIDER_AUTHORIZATION.gmail.scopes;

type JsonRecord = Record<string, unknown>;
type RequestContext = "api" | "history" | "oauth" | "revoke";

type HeaderEntry = {
	name: string;
	value: string;
};

type GmailPageToken =
	| {
			mode: "full";
			providerToken: string;
			snapshotCursor: string;
	  }
	| {
			mode: "history";
			providerToken: string;
			startCursor: string;
			completionCursor: string;
	  };

export type GmailMailboxAdapterConfig = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	fetch: typeof globalThis.fetch;
	now?: () => Date;
};

function malformedResponse() {
	return new MailboxProviderError({
		provider: PROVIDER,
		code: "malformed-response",
	});
}

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function utf8Length(value: string) {
	return Buffer.byteLength(value, "utf8");
}

function requiredString(
	value: unknown,
	maxBytes: number,
	options: { trim?: boolean; pattern?: RegExp } = {},
) {
	if (typeof value !== "string") throw malformedResponse();
	const normalized = options.trim === false ? value : value.trim();
	if (
		!normalized ||
		utf8Length(normalized) > maxBytes ||
		(options.pattern && !options.pattern.test(normalized))
	) {
		throw malformedResponse();
	}
	return normalized;
}

function optionalString(
	value: unknown,
	maxBytes: number,
	options: { trim?: boolean; pattern?: RegExp } = {},
) {
	if (value == null) return undefined;
	return requiredString(value, maxBytes, options);
}

function inputString(value: string, maxBytes: number) {
	if (
		typeof value !== "string" ||
		!value.trim() ||
		utf8Length(value) > maxBytes ||
		/[\r\n\0]/.test(value)
	) {
		throw malformedResponse();
	}
	return value;
}

function validateMessageId(value: unknown) {
	return requiredString(value, MAX_MESSAGE_ID_BYTES, {
		pattern: /^[A-Za-z0-9_-]+$/,
	});
}

function validateCursor(value: unknown) {
	return requiredString(value, MAX_CURSOR_BYTES, { pattern: /^\d+$/ });
}

function validateProviderPageToken(value: unknown) {
	const token = requiredString(value, MAX_PROVIDER_PAGE_TOKEN_BYTES);
	for (const character of token) {
		const code = character.charCodeAt(0);
		if (code < 32 || code === 127) throw malformedResponse();
	}
	return token;
}

function optionalProviderPageToken(value: unknown) {
	return value == null ? undefined : validateProviderPageToken(value);
}

function parseHeaders(payload: JsonRecord) {
	const rawHeaders = payload.headers;
	if (rawHeaders == null) return [];
	if (!Array.isArray(rawHeaders) || rawHeaders.length > MAX_HEADERS) {
		throw malformedResponse();
	}
	return rawHeaders.map((raw): HeaderEntry => {
		if (!isRecord(raw)) throw malformedResponse();
		return {
			name: requiredString(raw.name, MAX_HEADER_NAME_BYTES),
			value: requiredString(raw.value, MAX_HEADER_VALUE_BYTES),
		};
	});
}

function headerValue(headers: readonly HeaderEntry[], name: string) {
	const lowerName = name.toLowerCase();
	return headers.find((header) => header.name.toLowerCase() === lowerName)
		?.value;
}

function automationHeader(headers: readonly HeaderEntry[], name: string) {
	return optionalString(
		headerValue(headers, name),
		MAX_AUTOMATION_HEADER_BYTES,
	);
}

function parseLabels(value: unknown) {
	if (value == null) return [];
	if (!Array.isArray(value) || value.length > MAX_LABELS) {
		throw malformedResponse();
	}
	return [...new Set(value.map((label) => requiredString(label, 255)))].sort();
}

function findEmailAddresses(value: string) {
	const matches = value.match(
		/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?/gi,
	);
	if (!matches) return [];
	const addresses: string[] = [];
	for (const match of matches) {
		const email = match.toLowerCase();
		const [local, domain, ...extra] = email.split("@");
		if (
			extra.length > 0 ||
			!local ||
			!domain ||
			local.length > 64 ||
			domain.length > 253 ||
			email.length > 320 ||
			domain.startsWith(".") ||
			domain.endsWith(".") ||
			domain.includes("..")
		) {
			continue;
		}
		if (!addresses.includes(email)) addresses.push(email);
		if (addresses.length > MAX_ADDRESSES) throw malformedResponse();
	}
	return addresses;
}

function parseFrom(value: string) {
	const addresses = findEmailAddresses(value);
	const email = addresses[0];
	if (!email) throw malformedResponse();

	const emailIndex = value.toLowerCase().indexOf(email);
	const angleIndex = value.lastIndexOf("<", emailIndex);
	let name: string | undefined;
	if (angleIndex >= 0) {
		name = value
			.slice(0, angleIndex)
			.trim()
			.replace(/^"|"$/g, "")
			.replace(/\\(["\\])/g, "$1")
			.trim();
	} else {
		const parenthetical = value
			.slice(emailIndex + email.length)
			.match(/^\s*\(([^)]+)\)/);
		name = parenthetical?.[1]?.trim();
	}
	if (!name) return { email };
	return { email, name: name.slice(0, 255) };
}

function parseReceivedAt(message: JsonRecord, headers: readonly HeaderEntry[]) {
	if (
		typeof message.internalDate === "string" &&
		/^\d{1,16}$/.test(message.internalDate)
	) {
		const timestamp = Number(message.internalDate);
		if (Number.isSafeInteger(timestamp)) {
			const date = new Date(timestamp);
			if (!Number.isNaN(date.getTime())) return date;
		}
	}
	const dateHeader = headerValue(headers, "Date");
	if (dateHeader) {
		const date = new Date(dateHeader);
		if (!Number.isNaN(date.getTime())) return date;
	}
	throw malformedResponse();
}

function hasAttachment(
	payload: JsonRecord,
	budget = { parts: 0 },
	depth = 0,
): boolean {
	if (depth > MAX_MIME_DEPTH || ++budget.parts > MAX_PARTS) {
		throw malformedResponse();
	}
	const filename = optionalString(payload.filename, 255);
	if (filename) return true;
	const headers = parseHeaders(payload);
	const disposition = headerValue(
		headers,
		"Content-Disposition",
	)?.toLowerCase();
	if (disposition?.startsWith("attachment")) return true;
	const parts = payload.parts;
	if (parts == null) return false;
	if (!Array.isArray(parts) || parts.length > MAX_PARTS)
		throw malformedResponse();
	for (const part of parts) {
		if (!isRecord(part)) throw malformedResponse();
		if (hasAttachment(part, budget, depth + 1)) return true;
	}
	return false;
}

function parseSummary(
	value: unknown,
	expectedId?: string,
): MailboxMessageSummary {
	if (!isRecord(value)) throw malformedResponse();
	const providerMessageId = validateMessageId(value.id);
	if (expectedId && providerMessageId !== expectedId) {
		throw new MailboxProviderError({
			provider: PROVIDER,
			code: "account-mismatch",
		});
	}
	if (!isRecord(value.payload)) throw malformedResponse();
	const headers = parseHeaders(value.payload);
	const from = parseFrom(
		requiredString(headerValue(headers, "From"), MAX_HEADER_VALUE_BYTES),
	);
	const subject = optionalString(
		headerValue(headers, "Subject"),
		MAX_SUBJECT_BYTES,
	);
	const loopMarker =
		automationHeader(headers, "X-Loop") ??
		automationHeader(headers, "X-Autoreply") ??
		automationHeader(headers, "X-Autorespond");

	return {
		providerMessageId,
		providerThreadId: optionalString(value.threadId, MAX_MESSAGE_ID_BYTES, {
			pattern: /^[A-Za-z0-9_-]+$/,
		}),
		labelIds: parseLabels(value.labelIds),
		fromEmail: from.email,
		...(from.name ? { fromName: from.name } : {}),
		...(subject ? { subject } : {}),
		receivedAt: parseReceivedAt(value, headers),
		hasAttachments: hasAttachment(value.payload),
		headers: {
			...(automationHeader(headers, "Auto-Submitted")
				? { autoSubmitted: automationHeader(headers, "Auto-Submitted") }
				: {}),
			...(automationHeader(headers, "X-Auto-Response-Suppress")
				? {
						autoResponseSuppress: automationHeader(
							headers,
							"X-Auto-Response-Suppress",
						),
					}
				: {}),
			...(automationHeader(headers, "Precedence")
				? { precedence: automationHeader(headers, "Precedence") }
				: {}),
			...(automationHeader(headers, "List-Id")
				? { listId: automationHeader(headers, "List-Id") }
				: {}),
			...(loopMarker ? { loopMarker } : {}),
		},
	};
}

async function readBoundedBytes(response: Response, maxBytes: number) {
	const contentLength = response.headers.get("content-length");
	if (contentLength && /^\d+$/.test(contentLength)) {
		const declaredLength = Number(contentLength);
		if (!Number.isSafeInteger(declaredLength) || declaredLength > maxBytes) {
			await response.body?.cancel().catch(() => undefined);
			throw malformedResponse();
		}
	}
	if (!response.body) return new Uint8Array();

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (true) {
		const result = await reader.read();
		if (result.done) break;
		total += result.value.byteLength;
		if (total > maxBytes) {
			await reader.cancel().catch(() => undefined);
			throw malformedResponse();
		}
		chunks.push(result.value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

async function readBoundedJson(response: Response, maxBytes: number) {
	const bytes = await readBoundedBytes(response, maxBytes);
	if (bytes.byteLength === 0) throw malformedResponse();
	try {
		return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
	} catch {
		throw malformedResponse();
	}
}

async function providerErrorReasons(response: Response) {
	try {
		const value = await readBoundedJson(response, MAX_ERROR_BYTES);
		if (!isRecord(value)) return [];
		const error = value.error;
		if (typeof error === "string") return [error];
		if (!isRecord(error)) return [];
		const reasons: string[] = [];
		if (typeof error.status === "string") reasons.push(error.status);
		if (Array.isArray(error.errors)) {
			for (const entry of error.errors.slice(0, 20)) {
				if (isRecord(entry) && typeof entry.reason === "string") {
					reasons.push(entry.reason);
				}
			}
		}
		return reasons.map((reason) => reason.toLowerCase());
	} catch {
		return [];
	}
}

function retryAfterMs(response: Response, now: Date) {
	const value = response.headers.get("retry-after")?.trim();
	if (!value) return undefined;
	if (/^\d+$/.test(value)) {
		const seconds = Number(value);
		if (!Number.isSafeInteger(seconds)) return 15 * 60_000 + 1;
		return Math.min(seconds * 1000, 15 * 60_000 + 1);
	}
	const retryAt = new Date(value).getTime();
	if (Number.isNaN(retryAt)) return undefined;
	return Math.min(Math.max(0, retryAt - now.getTime()), 15 * 60_000 + 1);
}

function statusError(input: {
	status: number;
	context: RequestContext;
	reasons: readonly string[];
	retryAfterMs?: number;
}) {
	if (input.context === "history" && input.status === 404) {
		return new MailboxProviderError({
			provider: PROVIDER,
			code: "cursor-invalid",
		});
	}
	if (
		input.status === 401 ||
		(input.context === "oauth" && input.status === 400)
	) {
		return new MailboxProviderError({
			provider: PROVIDER,
			code: "authorization-revoked",
		});
	}
	if (input.status === 404) {
		return new MailboxProviderError({ provider: PROVIDER, code: "not-found" });
	}
	const rateLimitReasons = new Set([
		"dailylimitexceeded",
		"quotaexceeded",
		"ratelimitexceeded",
		"userratelimitexceeded",
	]);
	if (
		input.status === 429 ||
		(input.status === 403 &&
			input.reasons.some((reason) => rateLimitReasons.has(reason)))
	) {
		return new MailboxProviderError({
			provider: PROVIDER,
			code: "rate-limited",
			retryAfterMs: input.retryAfterMs,
		});
	}
	if (input.status === 403) {
		return new MailboxProviderError({
			provider: PROVIDER,
			code: "authorization-revoked",
		});
	}
	if (input.status === 408 || input.status === 409 || input.status >= 500) {
		return new MailboxProviderError({
			provider: PROVIDER,
			code: "provider-unavailable",
			retryAfterMs: input.retryAfterMs,
		});
	}
	return malformedResponse();
}

function encodePageToken(value: GmailPageToken) {
	const token = `${PAGE_TOKEN_PREFIX}${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
	if (utf8Length(token) > MAX_PAGE_TOKEN_BYTES) throw malformedResponse();
	return token;
}

function decodePageToken(value: string) {
	inputString(value, MAX_PAGE_TOKEN_BYTES);
	if (!value.startsWith(PAGE_TOKEN_PREFIX)) throw malformedResponse();
	try {
		const encoded = value.slice(PAGE_TOKEN_PREFIX.length);
		if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded))
			throw malformedResponse();
		const decoded = JSON.parse(
			Buffer.from(encoded, "base64url").toString("utf8"),
		);
		if (!isRecord(decoded)) throw malformedResponse();
		const mode = decoded.mode;
		const providerToken = validateProviderPageToken(decoded.providerToken);
		if (mode === "full") {
			return {
				mode,
				providerToken,
				snapshotCursor: validateCursor(decoded.snapshotCursor),
			} satisfies GmailPageToken;
		}
		if (mode === "history") {
			return {
				mode,
				providerToken,
				startCursor: validateCursor(decoded.startCursor),
				completionCursor: validateCursor(decoded.completionCursor),
			} satisfies GmailPageToken;
		}
		throw malformedResponse();
	} catch (error) {
		if (error instanceof MailboxProviderError) throw error;
		throw malformedResponse();
	}
}

function decodeBodyData(data: unknown) {
	const encoded = requiredString(
		data,
		Math.ceil((MAX_BODY_BYTES * 4) / 3) + 4,
		{
			trim: false,
			pattern: /^[A-Za-z0-9_-]*={0,2}$/,
		},
	);
	if (encoded.length % 4 === 1) throw malformedResponse();
	const bytes = Buffer.from(encoded, "base64url");
	if (bytes.byteLength > MAX_BODY_BYTES) throw malformedResponse();
	return bytes;
}

function decodeText(bytes: Uint8Array, headers: readonly HeaderEntry[]) {
	const contentType = headerValue(headers, "Content-Type");
	const charset = contentType?.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1];
	try {
		return new TextDecoder(charset ?? "utf-8").decode(bytes);
	} catch {
		return new TextDecoder("utf-8").decode(bytes);
	}
}

function validSince(value: Date | null, now: Date) {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw malformedResponse();
	}
	if (value.getTime() > now.getTime() + 5 * 60_000) throw malformedResponse();
	return value;
}

export class GmailSalesRequestMailboxAdapter
	implements SalesRequestMailboxAdapter
{
	readonly provider = PROVIDER;
	readonly #clientId: string;
	readonly #clientSecret: string;
	readonly #redirectUri: string;
	readonly #fetch: typeof globalThis.fetch;
	readonly #now: () => Date;

	constructor(config: GmailMailboxAdapterConfig) {
		this.#clientId = inputString(config.clientId, 2 * 1024);
		this.#clientSecret = inputString(config.clientSecret, 4 * 1024);
		this.#redirectUri = inputString(config.redirectUri, 2 * 1024);
		if (typeof config.fetch !== "function") throw malformedResponse();
		try {
			const redirect = new URL(this.#redirectUri);
			if (!new Set(["http:", "https:"]).has(redirect.protocol)) {
				throw malformedResponse();
			}
		} catch (error) {
			if (error instanceof MailboxProviderError) throw error;
			throw malformedResponse();
		}
		this.#fetch = config.fetch;
		this.#now = config.now ?? (() => new Date());
	}

	async createAuthorizationUrl(input: { state: string }) {
		const state = inputString(input.state, 512);
		if (!/^[A-Za-z0-9_-]{43}$/.test(state)) throw malformedResponse();
		const url = new URL(AUTHORIZATION_URL);
		url.searchParams.set("client_id", this.#clientId);
		url.searchParams.set("redirect_uri", this.#redirectUri);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("scope", REQUIRED_SCOPES.join(" "));
		url.searchParams.set("access_type", "offline");
		url.searchParams.set("prompt", "consent");
		url.searchParams.set("state", state);
		return url.toString();
	}

	async exchangeAuthorizationCode(input: { code: string }) {
		const body = new URLSearchParams({
			client_id: this.#clientId,
			client_secret: this.#clientSecret,
			code: inputString(input.code, MAX_TOKEN_BYTES),
			grant_type: "authorization_code",
			redirect_uri: this.#redirectUri,
		});
		const value = await this.#requestJson(
			TOKEN_URL,
			{
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body,
			},
			"oauth",
			MAX_PROFILE_BYTES,
		);
		const tokens = this.#parseTokenSet(value);
		if (!tokens.refreshToken) {
			throw new MailboxProviderError({
				provider: PROVIDER,
				code: "authorization-revoked",
			});
		}
		const accountValue = await this.#requestJson(
			USER_INFO_URL,
			{ headers: this.#authorizationHeaders(tokens) },
			"api",
			MAX_PROFILE_BYTES,
		);
		if (!isRecord(accountValue)) throw malformedResponse();
		const providerAccountId = requiredString(accountValue.id, 255);
		const email = requiredString(accountValue.email, 320).toLowerCase();
		if (findEmailAddresses(email)[0] !== email) throw malformedResponse();
		const displayName = optionalString(accountValue.name, 255);
		return {
			tokens,
			account: {
				provider: PROVIDER,
				providerAccountId,
				email,
				...(displayName ? { displayName } : {}),
			},
		};
	}

	async refreshTokens(input: { tokens: MailboxTokenSet }) {
		const refreshToken = input.tokens.refreshToken;
		if (!refreshToken) {
			throw new MailboxProviderError({
				provider: PROVIDER,
				code: "authorization-revoked",
			});
		}
		const body = new URLSearchParams({
			client_id: this.#clientId,
			client_secret: this.#clientSecret,
			grant_type: "refresh_token",
			refresh_token: inputString(refreshToken, MAX_TOKEN_BYTES),
		});
		const value = await this.#requestJson(
			TOKEN_URL,
			{
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body,
			},
			"oauth",
			MAX_PROFILE_BYTES,
		);
		return this.#parseTokenSet(value, input.tokens);
	}

	async revoke(input: { tokens: MailboxTokenSet }) {
		const token = input.tokens.refreshToken ?? input.tokens.accessToken;
		await this.#requestVoid(
			REVOKE_URL,
			{
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					token: inputString(token, MAX_TOKEN_BYTES),
				}),
			},
			"revoke",
		);
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
			throw malformedResponse();
		}
		return input.fullSync
			? this.#listFullMessages(input)
			: this.#listHistoryMessages(input);
	}

	async getMessage(input: {
		tokens: MailboxTokenSet;
		providerMessageId: string;
	}): Promise<MailboxMessageDetail> {
		const providerMessageId = validateMessageId(input.providerMessageId);
		const url = new URL(
			`${API_ROOT}/messages/${encodeURIComponent(providerMessageId)}`,
		);
		url.searchParams.set("format", "full");
		const value = await this.#apiJson(
			input.tokens,
			url,
			"api",
			MAX_MESSAGE_BYTES,
		);
		const summary = parseSummary(value, providerMessageId);
		if (!isRecord(value) || !isRecord(value.payload)) throw malformedResponse();
		const headers = parseHeaders(value.payload);
		const bodies = await this.#extractBodies(
			input.tokens,
			providerMessageId,
			value.payload,
		);
		return {
			...summary,
			toEmails: findEmailAddresses(headerValue(headers, "To") ?? ""),
			ccEmails: findEmailAddresses(headerValue(headers, "Cc") ?? ""),
			...(bodies.text ? { textBody: bodies.text } : {}),
			...(bodies.html ? { htmlBody: bodies.html } : {}),
		};
	}

	async #listFullMessages(input: {
		tokens: MailboxTokenSet;
		cursor?: string;
		pageToken?: string;
		labelId?: string;
		since: Date | null;
		limit: number;
	}) {
		const since = validSince(input.since, this.#validNow());
		let snapshotCursor: string;
		let providerPageToken: string | undefined;
		if (input.pageToken) {
			const page = decodePageToken(input.pageToken);
			if (page.mode !== "full") throw malformedResponse();
			snapshotCursor = page.snapshotCursor;
			providerPageToken = page.providerToken;
		} else {
			const profile = await this.#apiJson(
				input.tokens,
				new URL(`${API_ROOT}/profile`),
				"api",
				MAX_PROFILE_BYTES,
			);
			if (!isRecord(profile)) throw malformedResponse();
			snapshotCursor = validateCursor(profile.historyId);
		}
		const url = new URL(`${API_ROOT}/messages`);
		url.searchParams.set("maxResults", String(input.limit));
		url.searchParams.set("includeSpamTrash", "false");
		url.searchParams.set("q", `after:${Math.floor(since.getTime() / 1000)}`);
		url.searchParams.append("labelIds", input.labelId?.trim() || "INBOX");
		if (providerPageToken) url.searchParams.set("pageToken", providerPageToken);
		const value = await this.#apiJson(input.tokens, url, "api", MAX_LIST_BYTES);
		if (!isRecord(value)) throw malformedResponse();
		const ids = this.#parseListedMessageIds(value.messages, input.limit);
		const summaries = await this.#fetchSummaries(input.tokens, ids);
		const nextProviderPageToken = optionalProviderPageToken(
			value.nextPageToken,
		);
		return {
			messages: summaries.messages,
			removedProviderMessageIds: summaries.missingIds,
			...(nextProviderPageToken
				? {
						nextPageToken: encodePageToken({
							mode: "full",
							providerToken: nextProviderPageToken,
							snapshotCursor,
						}),
					}
				: { nextCursor: snapshotCursor }),
			cursorInvalid: false,
		};
	}

	async #listHistoryMessages(input: {
		tokens: MailboxTokenSet;
		cursor?: string;
		pageToken?: string;
		labelId?: string;
		limit: number;
	}) {
		const startCursor = validateCursor(input.cursor);
		let providerPageToken: string | undefined;
		let carriedCompletionCursor = startCursor;
		if (input.pageToken) {
			const page = decodePageToken(input.pageToken);
			if (page.mode !== "history" || page.startCursor !== startCursor) {
				throw malformedResponse();
			}
			providerPageToken = page.providerToken;
			carriedCompletionCursor = page.completionCursor;
		}
		const url = new URL(`${API_ROOT}/history`);
		url.searchParams.set("startHistoryId", startCursor);
		url.searchParams.set("historyTypes", "messageAdded");
		url.searchParams.append("historyTypes", "messageDeleted");
		url.searchParams.append("historyTypes", "labelAdded");
		url.searchParams.append("historyTypes", "labelRemoved");
		url.searchParams.set("labelId", input.labelId?.trim() || "INBOX");
		url.searchParams.set("maxResults", String(input.limit));
		if (providerPageToken) url.searchParams.set("pageToken", providerPageToken);
		const value = await this.#apiJson(
			input.tokens,
			url,
			"history",
			MAX_LIST_BYTES,
		);
		if (!isRecord(value)) throw malformedResponse();
		const completionCursor = value.historyId
			? validateCursor(value.historyId)
			: carriedCompletionCursor;
		const changes = this.#parseHistoryChanges(
			value.history,
			input.limit,
			input.labelId?.trim() || "INBOX",
		);
		const summaries = await this.#fetchSummaries(
			input.tokens,
			changes.addedIds.filter((id) => !changes.removedIds.includes(id)),
		);
		const nextProviderPageToken = optionalProviderPageToken(
			value.nextPageToken,
		);
		return {
			messages: summaries.messages,
			removedProviderMessageIds: [
				...new Set([...changes.removedIds, ...summaries.missingIds]),
			],
			...(nextProviderPageToken
				? {
						nextPageToken: encodePageToken({
							mode: "history",
							providerToken: nextProviderPageToken,
							startCursor,
							completionCursor,
						}),
					}
				: { nextCursor: completionCursor }),
			cursorInvalid: false,
		};
	}

	#parseListedMessageIds(value: unknown, limit: number) {
		if (value == null) return [];
		if (!Array.isArray(value) || value.length > limit)
			throw malformedResponse();
		const ids: string[] = [];
		for (const item of value) {
			if (!isRecord(item)) throw malformedResponse();
			const id = validateMessageId(item.id);
			if (!ids.includes(id)) ids.push(id);
		}
		return ids;
	}

	#parseHistoryChanges(value: unknown, limit: number, labelId: string) {
		if (value == null) return { addedIds: [], removedIds: [] };
		if (!Array.isArray(value) || value.length > MAX_PARTS) {
			throw malformedResponse();
		}
		const addedIds: string[] = [];
		const removedIds: string[] = [];
		for (const history of value) {
			if (!isRecord(history)) throw malformedResponse();
			const additions = history.messagesAdded;
			if (
				additions != null &&
				(!Array.isArray(additions) || additions.length > MAX_PARTS)
			) {
				throw malformedResponse();
			}
			for (const addition of additions ?? []) {
				if (!isRecord(addition) || !isRecord(addition.message)) {
					throw malformedResponse();
				}
				const id = validateMessageId(addition.message.id);
				if (!addedIds.includes(id)) addedIds.push(id);
				const removedIndex = removedIds.indexOf(id);
				if (removedIndex >= 0) removedIds.splice(removedIndex, 1);
			}
			const labelAdditions = history.labelsAdded;
			if (
				labelAdditions != null &&
				(!Array.isArray(labelAdditions) || labelAdditions.length > MAX_PARTS)
			) {
				throw malformedResponse();
			}
			for (const addition of labelAdditions ?? []) {
				if (
					!isRecord(addition) ||
					!isRecord(addition.message) ||
					!Array.isArray(addition.labelIds)
				) {
					throw malformedResponse();
				}
				if (!addition.labelIds.includes(labelId)) continue;
				const id = validateMessageId(addition.message.id);
				if (!addedIds.includes(id)) addedIds.push(id);
				const removedIndex = removedIds.indexOf(id);
				if (removedIndex >= 0) removedIds.splice(removedIndex, 1);
			}
			for (const field of ["messagesDeleted", "labelsRemoved"] as const) {
				const removals = history[field];
				if (
					removals != null &&
					(!Array.isArray(removals) || removals.length > MAX_PARTS)
				) {
					throw malformedResponse();
				}
				for (const removal of removals ?? []) {
					if (!isRecord(removal) || !isRecord(removal.message)) {
						throw malformedResponse();
					}
					if (field === "labelsRemoved") {
						if (!Array.isArray(removal.labelIds)) throw malformedResponse();
						if (!removal.labelIds.includes(labelId)) continue;
					}
					const id = validateMessageId(removal.message.id);
					if (!removedIds.includes(id)) removedIds.push(id);
					const addedIndex = addedIds.indexOf(id);
					if (addedIndex >= 0) addedIds.splice(addedIndex, 1);
				}
			}
			if (addedIds.length + removedIds.length > limit)
				throw malformedResponse();
		}
		return { addedIds, removedIds };
	}

	async #fetchSummaries(tokens: MailboxTokenSet, ids: readonly string[]) {
		const messages: MailboxMessageSummary[] = [];
		const missingIds: string[] = [];
		for (let offset = 0; offset < ids.length; offset += 5) {
			const batch = ids.slice(offset, offset + 5);
			const results = await Promise.all(
				batch.map(async (id) => {
					const url = new URL(`${API_ROOT}/messages/${encodeURIComponent(id)}`);
					url.searchParams.set("format", "metadata");
					for (const header of SUMMARY_HEADERS) {
						url.searchParams.append("metadataHeaders", header);
					}
					try {
						const value = await this.#apiJson(
							tokens,
							url,
							"api",
							MAX_METADATA_BYTES,
						);
						return { message: parseSummary(value, id) };
					} catch (error) {
						if (
							error instanceof MailboxProviderError &&
							error.code === "not-found"
						) {
							return { missingId: id };
						}
						throw error;
					}
				}),
			);
			for (const result of results) {
				if (result.message) messages.push(result.message);
				if (result.missingId) missingIds.push(result.missingId);
			}
		}
		return { messages, missingIds };
	}

	async #extractBodies(
		tokens: MailboxTokenSet,
		messageId: string,
		payload: JsonRecord,
	) {
		const values = { text: "", html: "" };
		const budget = { parts: 0 };
		const append = (kind: "text" | "html", value: string) => {
			const separator = values[kind] ? "\n\n" : "";
			if (
				utf8Length(values[kind]) + utf8Length(separator) + utf8Length(value) >
				MAX_BODY_BYTES
			) {
				throw malformedResponse();
			}
			values[kind] += separator + value;
		};
		const visit = async (part: JsonRecord, depth: number): Promise<void> => {
			if (depth > MAX_MIME_DEPTH || ++budget.parts > MAX_PARTS) {
				throw malformedResponse();
			}
			const mimeType = optionalString(part.mimeType, 255)?.toLowerCase();
			const headers = parseHeaders(part);
			const filename = optionalString(part.filename, 255);
			const disposition = headerValue(
				headers,
				"Content-Disposition",
			)?.toLowerCase();
			const isText = mimeType === "text/plain" || mimeType === "text/html";
			if (isText && !filename && !disposition?.startsWith("attachment")) {
				const body = part.body;
				if (body != null && !isRecord(body)) throw malformedResponse();
				let bytes: Uint8Array | undefined;
				if (isRecord(body) && body.data != null) {
					bytes = decodeBodyData(body.data);
				} else if (isRecord(body) && body.attachmentId != null) {
					const attachmentId = requiredString(
						body.attachmentId,
						MAX_MESSAGE_ID_BYTES,
						{ pattern: /^[A-Za-z0-9_-]+$/ },
					);
					const url = new URL(
						`${API_ROOT}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
					);
					const attachment = await this.#apiJson(
						tokens,
						url,
						"api",
						Math.ceil((MAX_BODY_BYTES * 4) / 3) + MAX_PROFILE_BYTES,
					);
					if (!isRecord(attachment)) throw malformedResponse();
					if (
						attachment.size != null &&
						(!Number.isSafeInteger(attachment.size) ||
							Number(attachment.size) < 0 ||
							Number(attachment.size) > MAX_BODY_BYTES)
					) {
						throw malformedResponse();
					}
					bytes = decodeBodyData(attachment.data);
				}
				if (bytes)
					append(
						mimeType === "text/plain" ? "text" : "html",
						decodeText(bytes, headers),
					);
			}
			const parts = part.parts;
			if (parts == null) return;
			if (!Array.isArray(parts) || parts.length > MAX_PARTS) {
				throw malformedResponse();
			}
			for (const child of parts) {
				if (!isRecord(child)) throw malformedResponse();
				await visit(child, depth + 1);
			}
		};
		await visit(payload, 0);
		return values;
	}

	#parseTokenSet(value: unknown, previous?: MailboxTokenSet): MailboxTokenSet {
		if (!isRecord(value)) throw malformedResponse();
		const accessToken = inputString(
			requiredString(value.access_token, MAX_TOKEN_BYTES, { trim: false }),
			MAX_TOKEN_BYTES,
		);
		const refreshToken = value.refresh_token
			? inputString(
					requiredString(value.refresh_token, MAX_TOKEN_BYTES, { trim: false }),
					MAX_TOKEN_BYTES,
				)
			: previous?.refreshToken;
		let grantedScopes = previous?.grantedScopes ?? REQUIRED_SCOPES;
		if (value.scope != null) {
			const scope = requiredString(value.scope, 8 * 1024);
			grantedScopes = [...new Set(scope.split(/\s+/).filter(Boolean))].sort();
			if (
				!REQUIRED_SCOPES.every((required) => grantedScopes.includes(required))
			) {
				throw new MailboxProviderError({
					provider: PROVIDER,
					code: "authorization-revoked",
				});
			}
		}
		let expiresAt: Date | undefined;
		if (value.expires_in != null) {
			if (
				!Number.isSafeInteger(value.expires_in) ||
				Number(value.expires_in) <= 0 ||
				Number(value.expires_in) > 365 * 24 * 60 * 60
			) {
				throw malformedResponse();
			}
			expiresAt = new Date(
				this.#validNow().getTime() + Number(value.expires_in) * 1000,
			);
		}
		return {
			accessToken,
			...(refreshToken ? { refreshToken } : {}),
			...(expiresAt ? { expiresAt } : {}),
			grantedScopes,
		};
	}

	#authorizationHeaders(tokens: MailboxTokenSet) {
		return {
			accept: "application/json",
			authorization: `Bearer ${inputString(tokens.accessToken, MAX_TOKEN_BYTES)}`,
		};
	}

	async #apiJson(
		tokens: MailboxTokenSet,
		url: URL,
		context: RequestContext,
		maxBytes: number,
	) {
		return this.#requestJson(
			url,
			{ headers: this.#authorizationHeaders(tokens) },
			context,
			maxBytes,
		);
	}

	async #requestJson(
		url: string | URL,
		init: RequestInit,
		context: RequestContext,
		maxBytes: number,
	) {
		const response = await this.#performFetch(url, init);
		if (!response.ok) {
			const reasons = await providerErrorReasons(response.clone());
			throw statusError({
				status: response.status,
				context,
				reasons,
				retryAfterMs: retryAfterMs(response, this.#validNow()),
			});
		}
		return readBoundedJson(response, maxBytes);
	}

	async #requestVoid(
		url: string | URL,
		init: RequestInit,
		context: RequestContext,
	) {
		const response = await this.#performFetch(url, init);
		if (!response.ok) {
			const reasons = await providerErrorReasons(response.clone());
			throw statusError({
				status: response.status,
				context,
				reasons,
				retryAfterMs: retryAfterMs(response, this.#validNow()),
			});
		}
		await readBoundedBytes(response, MAX_ERROR_BYTES);
	}

	async #performFetch(url: string | URL, init: RequestInit) {
		try {
			return await this.#fetch(url, init);
		} catch {
			throw new MailboxProviderError({ provider: PROVIDER, code: "network" });
		}
	}

	#validNow() {
		const now = this.#now();
		if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
			throw malformedResponse();
		}
		return now;
	}
}

export function createGmailMailboxAdapter(config: GmailMailboxAdapterConfig) {
	return new GmailSalesRequestMailboxAdapter(config);
}

export const createGmailSalesRequestMailboxAdapter = createGmailMailboxAdapter;
