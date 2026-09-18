/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { NewSalesFormLineItem } from "../schema";
import { CustomerRequestInterpretations } from "./customer-request-interpretations";

const interpretation = {
	lineUid: "line-1",
	stepId: 20,
	field: "door",
	sourceText: "smooth solid-core door slab",
	selectedProdUid: "door-a",
	selectedTitle: "S.C HARDBOARD FLUSH PRIMED 1-3/8",
	reason: "Closest compatible visible component.",
};

function line(prodUid: string) {
	return {
		uid: "line-1",
		meta: { salesRequestInterpretations: [interpretation] },
		formSteps: [{ stepId: 20, prodUid }],
	} as NewSalesFormLineItem;
}

describe("CustomerRequestInterpretations", () => {
	it("shows active mappings with a dismissal action", () => {
		const html = renderToStaticMarkup(
			<CustomerRequestInterpretations lineItems={[line("door-a")]} />,
		);

		expect(html).toContain("AI interpretation");
		expect(html).toContain("smooth solid-core door slab");
		expect(html).toContain("S.C HARDBOARD FLUSH PRIMED 1-3/8");
		expect(html).toContain("Don’t show again");
	});

	it("hides a mapping after its associated selection changes", () => {
		const html = renderToStaticMarkup(
			<CustomerRequestInterpretations lineItems={[line("door-b")]} />,
		);

		expect(html).toBe("");
	});
});
