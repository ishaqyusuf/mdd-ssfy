"use client";

import dynamic from "next/dynamic";

const InboundNeedsAttentionProvider = dynamic(
	() =>
		import("./inbound-needs-attention-provider").then(
			(module) => module.InboundNeedsAttentionProvider,
		),
	{ ssr: false },
);

export function InboundNeedsAttentionProviderLazy() {
	return <InboundNeedsAttentionProvider />;
}
