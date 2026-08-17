import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolveSpecialOrderSaveInterruption } from "./special-order-save-interruption";

function readSource(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const formSource = readSource("./new-sales-form.tsx");
const summarySource = readSource("./sections/invoice-overview-panel.tsx");
const overviewSource = readSource(
	"../../sheets/sales-overview-sheet/general-tab.tsx",
);
const overviewCardSource = readSource(
	"../../sheets/sales-overview-sheet/special-order-overview-card.tsx",
);
const columnsSource = readSource("../../tables-2/sales-orders/columns.tsx");
const declarationSource = readSource(
	"./sections/special-order-declaration-control.tsx",
);
const uiStylesSource = readSource(
	"../../../../../../packages/ui/src/styles/globals.css",
);

describe("Special Order enrollment pilot guard", () => {
	test("gates only new enrollment while preserving existing order repair", () => {
		expect(
			resolveSpecialOrderSaveInterruption({
				type: "order",
				intent: "close",
				declaration: null,
				hasCustomerEmail: false,
				enrollmentAccess: { status: "ready", canEnroll: false },
			}),
		).toBe("CONTINUE");
		expect(
			resolveSpecialOrderSaveInterruption({
				type: "order",
				intent: "close",
				declaration: "YES",
				hasCustomerEmail: false,
				enrollmentAccess: { status: "ready", canEnroll: false },
			}),
		).toBe("CUSTOMER_EMAIL_REQUIRED");
		expect(
			resolveSpecialOrderSaveInterruption({
				type: "order",
				intent: "close",
				declaration: "YES",
				hasCustomerEmail: true,
				enrollmentAccess: { status: "ready", canEnroll: false },
			}),
		).toBe("CONTINUE");

		expect(formSource).toContain("specialOrder.enrollmentAccess");
		expect(formSource).toContain(
			"canEnrollSpecialOrder={canEnrollSpecialOrder}",
		);
		expect(summarySource).toContain(
			"showDeclarationControl={props.canEnrollSpecialOrder}",
		);
		expect(summarySource).toContain("<SpecialOrderDeclarationControl");
	});

	test("waits for authoritative access before requiring an unanswered declaration", () => {
		const base = {
			type: "order" as const,
			intent: "final" as const,
			declaration: null,
			hasCustomerEmail: true,
		};
		expect(
			resolveSpecialOrderSaveInterruption({
				...base,
				enrollmentAccess: { status: "pending" },
			}),
		).toBe("ENROLLMENT_ACCESS_PENDING");
		expect(
			resolveSpecialOrderSaveInterruption({
				...base,
				enrollmentAccess: { status: "error" },
			}),
		).toBe("ENROLLMENT_ACCESS_ERROR");
		expect(
			resolveSpecialOrderSaveInterruption({
				...base,
				enrollmentAccess: { status: "ready", canEnroll: true },
			}),
		).toBe("DECLARATION_REQUIRED");
	});

	test("keeps draft saves interruption-free", () => {
		expect(
			resolveSpecialOrderSaveInterruption({
				type: "order",
				intent: "draft",
				declaration: "YES",
				hasCustomerEmail: false,
				enrollmentAccess: { status: "pending" },
			}),
		).toBe("CONTINUE");
	});

	for (const intent of ["close", "new", "final"] as const) {
		test(`requires classification before ${intent} save`, () => {
			expect(
				resolveSpecialOrderSaveInterruption({
					type: "order",
					intent,
					declaration: null,
					hasCustomerEmail: true,
					enrollmentAccess: { status: "ready", canEnroll: true },
				}),
			).toBe("DECLARATION_REQUIRED");
		});
	}

	test("keeps governed state available without a standalone order column", () => {
		expect(columnsSource).not.toContain("specialOrderColumn");
		expect(columnsSource).toContain("SpecialOrderIndicator");
		expect(columnsSource).toContain("Icons.PenTool");
		expect(overviewSource).toContain("<SpecialOrderOverviewCard />");
	});

	test("offers guarded Sales Overview enrollment with email continuation", () => {
		for (const marker of [
			"specialOrder.enrollmentAccess",
			"auth.can?.editOrders",
			"enrollmentAccess.data?.canEnroll === true",
			"Mark as Special Order",
			"CustomerEmailRequiredDialog",
			"specialOrder.enrollFromOverview",
			"No approval request was sent",
		]) {
			expect(overviewCardSource).toContain(marker);
		}
		expect(overviewCardSource).toContain(
			"!hasSpecialOrderCustomerEmail(data?.email)",
		);
		expect(overviewCardSource).toContain(
			"Optional. Enter at least 3 characters, or leave it blank.",
		);
		expect(overviewCardSource).toContain(
			'aria-describedby="special-order-action-reason-help"',
		);
		expect(overviewCardSource).toContain('document.execCommand("copy")');
		expect(overviewCardSource).toContain(
			"await copyTextToClipboard(result.approvalUrl)",
		);
	});

	test("renders the compact classification control and one optional-reason modal", () => {
		expect(declarationSource).not.toContain(
			"Does this order contain Special Order items?",
		);
		expect(declarationSource).not.toContain("Choose Yes or No before");
		expect(declarationSource).toContain(
			'value={props.declaration ?? "NO"}',
		);
		expect(declarationSource).toContain("Reason (optional)");
		expect(declarationSource.match(/<Dialog\s/g)?.length).toBe(1);
		expect(declarationSource).toContain("Proceed");
		expect(declarationSource).toContain(
			'pendingDeclaration === props.declaration',
		);
		expect(declarationSource).toContain(
			"props.onRequiredPromptOpenChange?.(false)",
		);
		expect(
			declarationSource.match(
				/className="data-\[state=on\]:bg-success data-\[state=on\]:text-success-foreground"/g,
			),
		).toHaveLength(2);
		expect(uiStylesSource).toContain("--color-success: var(--success);");
		expect(uiStylesSource).toContain(
			"--color-success-foreground: var(--success-foreground);",
		);
		expect(formSource).toContain("setPendingSpecialOrderCommit(null)");
	});
});
