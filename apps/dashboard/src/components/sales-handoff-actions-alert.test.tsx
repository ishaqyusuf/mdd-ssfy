import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesHandoffActionsAlertContent } from "./sales-handoff-actions-alert";

describe("SalesHandoffActionsAlertContent", () => {
	it("renders one compact exact-order summary and Needs Action link", () => {
		const markup = renderToStaticMarkup(
			<SalesHandoffActionsAlertContent count={36} />,
		);

		expect(markup).toContain("36 paid sales need action.");
		expect(markup).toContain("View needs action");
		expect(markup).toContain(
			'href="/sales-book/orders?needsAction=open&amp;tabName=Needs+Action"',
		);
		expect(markup).not.toContain("#SO-");
	});

	it("does not render an empty action alert", () => {
		expect(
			renderToStaticMarkup(<SalesHandoffActionsAlertContent count={0} />),
		).toBe("");
	});
});
