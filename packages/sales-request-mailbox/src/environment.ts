import type { SalesRequestMailboxAdapter } from "./adapter.js";
import type { MailboxConnectionKeyRing } from "./connection-lifecycle.js";
import type { MailboxProvider } from "./contracts.js";
import type { MailboxDisconnectKeyRing } from "./disconnect-lifecycle.js";
import {
	GmailSalesRequestMailboxAdapter,
	MicrosoftGraphMailboxAdapter,
} from "./providers/index.js";

type MailboxEnvironment = Readonly<Record<string, string | undefined>>;

const PROVIDER_ENVIRONMENT = {
	gmail: {
		clientId: "SALES_REQUEST_GMAIL_CLIENT_ID",
		clientSecret: "SALES_REQUEST_GMAIL_CLIENT_SECRET",
		redirectUri: "SALES_REQUEST_GMAIL_REDIRECT_URI",
	},
	"microsoft-graph": {
		clientId: "SALES_REQUEST_MICROSOFT_CLIENT_ID",
		clientSecret: "SALES_REQUEST_MICROSOFT_CLIENT_SECRET",
		redirectUri: "SALES_REQUEST_MICROSOFT_REDIRECT_URI",
	},
} as const satisfies Record<
	MailboxProvider,
	{ clientId: string; clientSecret: string; redirectUri: string }
>;

function readProviderConfiguration(
	environment: MailboxEnvironment,
	provider: MailboxProvider,
) {
	const names = PROVIDER_ENVIRONMENT[provider];
	const values = {
		clientId: environment[names.clientId]?.trim(),
		clientSecret: environment[names.clientSecret]?.trim(),
		redirectUri: environment[names.redirectUri]?.trim(),
	};
	const present = Object.values(values).filter(Boolean).length;
	if (present === 0) return { kind: "absent" } as const;
	if (present !== 3) return { kind: "incomplete" } as const;
	return {
		kind: "configured",
		configuration: values as {
			clientId: string;
			clientSecret: string;
			redirectUri: string;
		},
	} as const;
}

export function createSalesRequestMailboxAdaptersFromEnvironment(
	environment: MailboxEnvironment,
	dependencies: { fetch: typeof globalThis.fetch },
) {
	const adapters: Partial<Record<MailboxProvider, SalesRequestMailboxAdapter>> =
		{};
	const configuredProviders: MailboxProvider[] = [];
	const incompleteProviders: MailboxProvider[] = [];

	for (const provider of Object.keys(
		PROVIDER_ENVIRONMENT,
	) as MailboxProvider[]) {
		const resolved = readProviderConfiguration(environment, provider);
		if (resolved.kind === "absent") continue;
		if (resolved.kind === "incomplete") {
			incompleteProviders.push(provider);
			continue;
		}
		const config = { ...resolved.configuration, fetch: dependencies.fetch };
		adapters[provider] =
			provider === "gmail"
				? new GmailSalesRequestMailboxAdapter(config)
				: new MicrosoftGraphMailboxAdapter(config);
		configuredProviders.push(provider);
	}

	return {
		adapters,
		configuredProviders,
		incompleteProviders,
	} as const;
}

export type MailboxEnvironmentKeyRing = MailboxConnectionKeyRing &
	MailboxDisconnectKeyRing;

export function createMailboxEnvironmentKeyRing(
	environment: MailboxEnvironment,
): MailboxEnvironmentKeyRing {
	const activeVersion =
		environment.SALES_REQUEST_MAILBOX_ACTIVE_KEY_VERSION?.trim();
	let encodedKeys: unknown;
	try {
		encodedKeys = JSON.parse(
			environment.SALES_REQUEST_MAILBOX_ENCRYPTION_KEYS ?? "",
		);
	} catch {
		throw new Error("Mailbox encryption is not configured.");
	}
	if (
		!activeVersion ||
		activeVersion.length > 64 ||
		!encodedKeys ||
		typeof encodedKeys !== "object" ||
		Array.isArray(encodedKeys)
	) {
		throw new Error("Mailbox encryption is not configured.");
	}
	const keys = new Map<string, Buffer>();
	for (const [version, encoded] of Object.entries(encodedKeys)) {
		if (
			!version.trim() ||
			version.length > 64 ||
			typeof encoded !== "string" ||
			!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
		) {
			throw new Error("Mailbox encryption is not configured.");
		}
		const key = Buffer.from(encoded, "base64");
		if (key.byteLength !== 32) {
			throw new Error("Mailbox encryption is not configured.");
		}
		keys.set(version, key);
	}
	if (!keys.has(activeVersion)) {
		throw new Error("Mailbox encryption is not configured.");
	}

	return {
		active: () => ({
			keyVersion: activeVersion,
			key: Buffer.from(keys.get(activeVersion) as Buffer),
		}),
		resolve: (keyVersion) => {
			const key = keys.get(keyVersion);
			if (!key) throw new Error("Mailbox encryption key is unavailable.");
			return Buffer.from(key);
		},
	};
}
