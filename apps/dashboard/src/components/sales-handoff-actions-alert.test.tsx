import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesHandoffActionPills } from "./sales-handoff-actions-alert";

describe("SalesHandoffActionPills", () => {
	it("renders Material and Production actions as native buttons inside a semantic list", () => {
		const markup = renderToStaticMarkup(
			<SalesHandoffActionPills
				actions={[
					{
						id: "action-1",
						orderId: "SO-1001",
						type: "MATERIAL",
					} as never,
					{
						id: "action-2",
						orderId: "SO-1002",
						type: "PRODUCTION",
					} as never,
				]}
				onOpen={() => undefined}
			/>,
		);

		expect(markup).toContain("<ul");
		expect(markup).toContain("<li>");
		expect(markup).toMatch(/<button[^>]*type="button"/);
		expect(markup).toContain("#SO-1001 — Material");
		expect(markup).toContain("#SO-1002 — Production");
		expect(markup).toContain(
			'aria-label="Open order #SO-1001 Material action"',
		);
		expect(markup).toContain(
			'aria-label="Open order #SO-1002 Production action"',
		);
		expect(markup.match(/<button[^>]*type="button"/g)).toHaveLength(2);
		expect(markup).not.toContain('role="listitem"');
	});

	it("adds a representative tooltip while preserving the accessible action label", () => {
		const markup = renderToStaticMarkup(
			<SalesHandoffActionPills
				actions={[
					{
						id: "action-1",
						orderId: "SO-1001",
						type: "MATERIAL",
						responsibleRepName: "Pablo Cruz",
					} as never,
				]}
				identifyRepresentative
				onOpen={() => undefined}
			/>,
		);

		expect(markup).toContain('data-state="closed"');
		expect(markup).toContain(
			'aria-label="Open order #SO-1001 Material action for Pablo Cruz"',
		);
	});
});
