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
		const element = node as {
			type?: unknown;
			props?: { children?: unknown };
		};
		if (typeof element.type === "function") {
			collectText(element.type(element.props || {}), output);
			return output;
		}
		collectText(
			element.props?.children,
			output,
		);
	}
	return output;
}

function collectProps(node: unknown, output: Array<Record<string, unknown>> = []) {
	if (node === null || node === undefined || typeof node !== "object") {
		return output;
	}
	if (Array.isArray(node)) {
		for (const child of node) {
			collectProps(child, output);
		}
		return output;
	}
	if ("props" in node) {
		const element = node as {
			type?: unknown;
			props?: Record<string, unknown>;
		};
		const props = element.props || {};
		if (typeof element.type === "function") {
			collectProps(element.type(props), output);
			return output;
		}
		output.push(props);
		collectProps(props.children, output);
	}
	return output;
}

function compactText(node: unknown) {
	return collectText(node).join(" ").replace(/\s+/g, " ").trim();
}

function createPrintData(overrides: Record<string, unknown> = {}) {
	return {
		title: "Payout_2653",
		printedAt: new Date("2026-07-03T16:52:58.000Z"),
		companyAddress: {
			address1: "13285 SW 131 ST",
			address2: "Miami, Fl 33186",
			phone: "305-278-6555",
			fax: "305-278-2003",
		},
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
						description: "Lote 10/3; 14 yales 14 doorstop 1 presion.",
						isCustom: true,
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
		...overrides,
	};
}

describe("ContractorPayoutPdfDocument", () => {
	it("renders cover branding, company address, contractor info, and watermark assets", () => {
		const document = ContractorPayoutPdfDocument({
			title: "Payout_2653",
			baseUrl: "https://gnd.test",
			data: createPrintData(),
		});

		const text = compactText(document);
		const imageSources = collectProps(document)
			.map((props) => props.src)
			.filter(Boolean);

		expect(text).toContain("13285 SW 131 ST");
		expect(text).toContain("G&C Interior & Exterior INC");
		expect(text).toContain("305-278-6555");
		expect(imageSources).toContain("https://gnd.test/logo.png");
		expect(imageSources).toContain("https://gnd.test/logo-grayscale.png");
	});

	it("promotes custom job description details instead of generic custom labels", () => {
		const document = ContractorPayoutPdfDocument({
			title: "Payout_2653",
			data: createPrintData(),
		});

		const text = compactText(document);

		expect(text).toContain("# 20811 Lote 10/3");
		expect(text).toContain("14 yales 14 doorstop 1 presion.");
		expect(text).not.toContain("Custom Job - CUSTOM");
	});

	it("renders cancelled payout watermark text", () => {
		const data = createPrintData({
			payouts: [
				{
					...createPrintData().payouts[0],
					isCancelled: true,
				},
			],
		});
		const document = ContractorPayoutPdfDocument({
			title: "Payout_2653",
			data,
		});

		expect(compactText(document)).toContain("CANCELLED");
	});

	it("keeps included job rows from splitting across pages", () => {
		const document = ContractorPayoutPdfDocument({
			title: "Payout_2653",
			data: createPrintData(),
		});
		const wrapFalseNodes = collectProps(document).filter(
			(props) => props.wrap === false,
		);

		expect(wrapFalseNodes.length).toBeGreaterThanOrEqual(1);
	});
});
