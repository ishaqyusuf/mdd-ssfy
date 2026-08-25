import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const sheetSource = readFileSync(
	new URL("./sales-change-review-sheet.tsx", import.meta.url),
	"utf8",
);
const formSource = readFileSync(
	new URL("../new-sales-form.tsx", import.meta.url),
	"utf8",
);

describe("sales change review", () => {
	it("uses authenticated sales-representative approval without a customer link", () => {
		expect(sheetSource).toContain('"Approve"');
		expect(sheetSource).toContain("Committing changes…");
		expect(sheetSource).not.toContain("Create customer approval link");
		expect(sheetSource).not.toContain("Copy approval link");
		expect(sheetSource).not.toContain("Customer contact reference");
		expect(formSource).not.toContain("approvalUrl");
	});

	it("interrupts saving only for the focused sales-rep review boundary", () => {
		expect(formSource).toContain("requiresSalesRepApproval");
		expect(formSource).toContain("hasSalesRepApprovalChange");
		expect(formSource).toContain("Approved change is still applying");
		expect(formSource).toContain(
			"if (!opened && intent) setPendingCommittedChangeSaveIntent(null)",
		);
	});

	it("requires a downstream acknowledgement and an explicit inbound disposition", () => {
		expect(sheetSource).toContain("Cancel open inbound quantity");
		expect(sheetSource).toContain("Keep for warehouse stock");
		expect(sheetSource).toContain("review.requiresInboundDisposition ? (");
		expect(sheetSource).toContain("Open inbound");
		expect(sheetSource).not.toContain(
			"Inbound {review.commitments.inboundQty}",
		);
		expect(sheetSource).toContain("acknowledgeOperationalImpact");
		expect(sheetSource).toContain(
			"I understand this sale already has operational activity.",
		);
		expect(sheetSource).toContain("Preserve that evidence");
		expect(sheetSource).not.toContain("This change cannot be submitted.");
		expect(formSource).toContain("acknowledgeOperationalImpact:");
		expect(formSource).toContain("input.acknowledgeOperationalImpact");
	});
});
