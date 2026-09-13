import type { SalesRequestMailboxAdapter } from "../adapter.js";
import {
	type GmailMailboxAdapterConfig,
	GmailSalesRequestMailboxAdapter,
} from "./gmail.js";
import {
	MicrosoftGraphMailboxAdapter,
	type MicrosoftGraphMailboxAdapterConfig,
} from "./microsoft-graph.js";

export type SalesRequestMailboxAdapterFactoryInput =
	| { provider: "gmail"; config: GmailMailboxAdapterConfig }
	| {
			provider: "microsoft-graph";
			config: MicrosoftGraphMailboxAdapterConfig;
	  };

export function createSalesRequestMailboxAdapter(
	input: SalesRequestMailboxAdapterFactoryInput,
): SalesRequestMailboxAdapter {
	switch (input.provider) {
		case "gmail":
			return new GmailSalesRequestMailboxAdapter(input.config);
		case "microsoft-graph":
			return new MicrosoftGraphMailboxAdapter(input.config);
	}
}

export { GmailSalesRequestMailboxAdapter, MicrosoftGraphMailboxAdapter };
export type { GmailMailboxAdapterConfig, MicrosoftGraphMailboxAdapterConfig };
