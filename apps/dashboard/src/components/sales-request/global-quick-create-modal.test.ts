import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const providerSource = readFileSync(
	new URL("../sheets/global-sheets-provider.tsx", import.meta.url),
	"utf8",
);
const triggerSource = readFileSync(
	new URL("./open-sales-request-quick-create-button.tsx", import.meta.url),
	"utf8",
);

describe("Global Sales Request quick-create modal", () => {
	test("loads the modal with the global surface instead of waiting for the click", () => {
		expect(providerSource).toContain("<SalesRequestQuickCreateModal />");
		expect(providerSource).not.toContain(
			"salesRequestOpen ? <SalesRequestQuickCreateModal /> : null",
		);
		expect(providerSource).not.toContain("useSalesRequestQuickCreateStore");
	});

	test("keeps the global trigger outside native form submission", () => {
		expect(triggerSource).toMatch(
			/<Button[\s\S]{0,160}type="button"[\s\S]{0,240}onClick=\{open\}/,
		);
	});
});
