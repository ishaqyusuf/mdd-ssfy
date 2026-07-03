import { describe, expect, it } from "bun:test";
import { ContractorPayoutPdfDocument } from "./document";

function collectText(node: unknown, output: string[] = []) {
	if (node === null || node === undefined || typeof node === "boolean") {
		return output;
	}
	if (typeof node === "string" || typeof node === "number") {
		output.push(String(node));
		return output;
	}
	if (Array.isArray(node)) {
		for (const child of node) {
			collectText(child, output);
		}
		return output;
	}
	if (typeof node === "object" && "props" in node) {
		collectText(
			(node as { props?: { children?: unknown } }).props?.children,
			output,
		);
	}
	return output;
}

describe("ContractorPayoutPdfDocument", () => {
	it("renders payout job descriptions in the included jobs table", () => {
		const document = ContractorPayoutPdfDocument({
			title: "Payout_2653",
			data: {
				title: "Payout_2653",
				printedAt: new Date("2026-07-03T16:52:58.000Z"),
				summary: {
					payoutCount: 1,
					totalAmount: 2074,
					totalJobs: 1,
				},
				payouts: [
					{
						id: 2653,
						amount: 2074,
						subTotal: 2074,
						charges: 0,
						paymentMethod: "Check",
						checkNo: "1759",
						createdAt: new Date("2026-07-03T16:52:58.000Z"),
						paidTo: {
							id: 77,
							name: "G&C Interior & Exterior INC",
							email: "installer@example.com",
						},
						authorizedBy: {
							id: 12,
							name: "Arlen Delgado",
						},
						isCancelled: false,
						jobCount: 1,
						adjustments: [],
						jobs: [
							{
								id: 20811,
								title: "Custom Job",
								subtitle: "CUSTOM",
								description: "Install 8 closet doors and doorstops.",
								amount: 2074,
								status: "Paid",
								createdAt: new Date("2026-07-03T16:52:58.000Z"),
								projectTitle: null,
								lotBlock: null,
								modelName: null,
							},
						],
					},
				],
			},
		});

		expect(collectText(document).join(" ")).toContain(
			"Install 8 closet doors and doorstops.",
		);
	});
});
