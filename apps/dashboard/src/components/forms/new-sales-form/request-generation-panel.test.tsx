/** @jsxImportSource react */

import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesRequestGenerationPanelView } from "./request-generation-panel";
import { buildSalesRequestReviewModel } from "./request-generation-presentation";

const routeData = {
	stepsById: { 1: "item-type", 2: "door-size" },
	stepsByUid: {
		"item-type": {
			id: 1,
			uid: "item-type",
			title: "Item Type",
			components: [{ uid: "root-door", title: "Interior Doors" }],
		},
		"door-size": {
			id: 2,
			uid: "door-size",
			title: "Door Size",
			components: [{ uid: "size-6-8", title: "6-8" }],
		},
	},
	settingsMeta: {},
	composedRouter: {},
};

const result = {
	configurationRevision: "config-1",
	seed: {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "line-1",
				qty: 2,
				formSteps: [{ stepId: 1, prodUid: "root-door" }],
				housePackageTool: {
					doors: [{ dimension: "3-0 x 6-8", totalQty: 2 }],
				},
			},
		],
		form: { deliveryOption: "delivery" },
		extraCosts: [{ id: null, label: "Delivery", type: "Delivery", amount: 85 }],
		unresolved: [
			{
				lineUid: "line-1",
				stepId: 2,
				field: "Door size",
				status: "ambiguous",
				reason: "The request includes two sizes.",
			},
		],
	},
} as never;

const baseProps = {
	open: true,
	onOpenChange: () => {},
	sourceText: "Two interior doors, deliver to site.",
	status: "success" as const,
	requestId: 1,
	capturedRevision: null,
	result,
	failure: null,
	isStale: false,
	canRetry: true,
	setSourceText: () => {},
	onGenerate: () => {},
	onCancel: () => {},
	onClear: () => {},
	onRetry: () => {},
	model: buildSalesRequestReviewModel(result, routeData),
	canInspectJson: false,
};

test("renders a responsive review with Apply safely disabled until the boundary is wired", () => {
	const html = renderToStaticMarkup(
		<SalesRequestGenerationPanelView {...baseProps} />,
	);

	expect(html).toContain('aria-label="Customer request"');
	expect(html).toContain("36 / 20000 characters");
	expect(html).toContain(">Clear<");
	expect(html).toContain(">Regenerate<");
	expect(html).toContain("Interior Doors");
	expect(html).toContain("Quantity 2");
	expect(html).toContain("3-0 x 6-8");
	expect(html).toContain("Delivery");
	expect(html).toContain("$85.00");
	expect(html).toContain("Needs review");
	expect(html).toContain("Warnings");
	expect(html).toContain("Configured defaults");
	expect(html).toContain(">Apply to form<");
	expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Apply to form<\/button>/);

	const emptyReviewHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			result={null}
			model={null}
			canRetry={false}
		/>,
	);
	expect(emptyReviewHtml).toContain(">Generate<");
});

test("keeps unresolved facts blocking and exposes keyboard-safe Apply and Undo outcomes", () => {
	const resolvedModel = {
		...baseProps.model,
		unresolved: [],
	};
	const enabledHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			model={resolvedModel}
			applyDisabled={false}
			onApply={() => {}}
		/>,
	);
	expect(enabledHtml).toMatch(/<button[^>]*>Apply to form<\/button>/);
	expect(enabledHtml).toContain('type="button"');

	const blockedHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			applyDisabled={false}
			applyDisabledReason="blocking-review"
			onApply={() => {}}
		/>,
	);
	expect(blockedHtml).toMatch(
		/<button[^>]*disabled=""[^>]*>Apply to form<\/button>/,
	);
	expect(blockedHtml).toContain("Resolve every blocking item before applying.");

	const undoHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			model={resolvedModel}
			applyDisabled={false}
			onApply={() => {}}
			applyMessage="Applied to the form."
			applyResult={{
				status: "applied",
				proposal: {} as never,
			}}
			undoAvailability="selective"
			onUndo={() => {}}
			undoMessage="Generated changes were removed; 1 edited line was retained."
		/>,
	);
	expect(undoHtml).toContain(">Undo generated changes<");
	expect(undoHtml).toContain("edited line was retained");
	expect(undoHtml).toContain('aria-live="polite"');
});

test("renders pending, failure, and stale states accessibly", () => {
	const pendingHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			status="pending"
			result={null}
			model={null}
			canRetry={false}
		/>,
	);
	expect(pendingHtml).toContain("<output");
	expect(pendingHtml).toContain("Generating preview");
	expect(pendingHtml).toContain(">Cancel<");

	const errorHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			status="error"
			failure={{
				code: "invalid-output",
				message: "The generated preview could not be validated.",
				retryable: true,
				referenceId: "ERR-1",
			}}
			result={null}
			model={null}
		/>,
	);
	expect(errorHtml).toContain('role="alert"');
	expect(errorHtml).toContain("The generated preview could not be validated.");
	expect(errorHtml).toContain(">Retry<");

	const staleHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView {...baseProps} isStale />,
	);
	expect(staleHtml).toContain("This preview is stale");
	expect(staleHtml).toContain("Generate again");
});

test("keeps seed JSON behind the Super Admin/developer disclosure", () => {
	const hiddenHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView {...baseProps} canInspectJson={false} />,
	);
	expect(hiddenHtml).not.toContain('aria-label="Seed JSON"');
	expect(hiddenHtml).not.toContain('"schemaVersion"');

	const visibleHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView {...baseProps} canInspectJson />,
	);
	expect(visibleHtml).toContain("Developer seed JSON");
	expect(visibleHtml).toContain("&quot;schemaVersion&quot;: 2");
});

test("offers bounded category-only feedback after Apply", () => {
	const html = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			model={{ ...baseProps.model, unresolved: [] }}
			applyDisabled={false}
			onApply={() => {}}
			applyResult={{ status: "applied", proposal: {} as never }}
			onSubmitFeedback={async () => true}
		/>,
	);

	expect(html).toContain("How accurate was this proposal?");
	expect(html).toContain("Accepted with edits");
	expect(html).toContain("Rejected");
	expect(html).toContain('role="radio"');
	expect(html).not.toContain("Additional feedback");
	expect(html).not.toContain("free text");

	const undoneHtml = renderToStaticMarkup(
		<SalesRequestGenerationPanelView
			{...baseProps}
			model={{ ...baseProps.model, unresolved: [] }}
			applyResult={{ status: "applied", proposal: {} as never }}
			undoResult={{
				status: "restored",
				proposalId: "proposal-1",
			}}
			onSubmitFeedback={async () => true}
		/>,
	);
	expect(undoneHtml).not.toContain("How accurate was this proposal?");
});
