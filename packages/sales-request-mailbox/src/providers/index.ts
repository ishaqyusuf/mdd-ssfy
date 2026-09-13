import type { SalesRequestMailboxAdapter } from "../adapter";
import {
	type GmailMailboxAdapterConfig,
	GmailSalesRequestMailboxAdapter,
} from "./gmail";
import {
	MicrosoftGraphMailboxAdapter,
	type MicrosoftGraphMailboxAdapterConfig,
} from "./microsoft-graph";

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
