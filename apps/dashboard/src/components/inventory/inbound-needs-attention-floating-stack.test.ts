import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sidebarLayoutSource = readFileSync(
	new URL("../../app/(sidebar)/layout.tsx", import.meta.url),
	"utf8",
);
const attentionSource = readFileSync(
	new URL("./inbound-needs-attention-provider.tsx", import.meta.url),
	"utf8",
);
const taskNotificationSource = readFileSync(
	new URL("../task-notification.tsx", import.meta.url),
	"utf8",
);

describe("dashboard floating action stack", () => {
	test("lets rendered content determine whether Needs Attention moves above tasks", () => {
		expect(sidebarLayoutSource).toMatch(
			/data-dashboard-floating-stack[\s\S]*<Env isDev>[\s\S]*<InboundNeedsAttentionProviderLazy \/>[\s\S]*<TaskNotificationProvider \/>/,
		);
		expect(sidebarLayoutSource).toContain(
			"fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2",
		);
		expect(taskNotificationSource).not.toContain(
			"fixed right-4 bottom-4 z-40",
		);
		expect(attentionSource).not.toContain("fixed top-1/2 right-4 z-40");
	});

	test("keeps a compact count FAB and reveals its state on hover or focus", () => {
		expect(attentionSource).toContain("hover:w-[min(22rem,calc(100vw-2rem))]");
		expect(attentionSource).toContain("focus-visible:w-[min(22rem,calc(100vw-2rem))]");
		expect(attentionSource).toContain("group-hover:opacity-100");
		expect(attentionSource).toContain("group-focus-visible:opacity-100");
		expect(attentionSource).toContain("{attentionCount}");
	});
});
