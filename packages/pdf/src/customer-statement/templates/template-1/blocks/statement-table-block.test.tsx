import { describe, expect, it } from "bun:test";
import type { CustomerStatementPdfData } from "../../../types";
import { StatementTableBlock } from "./statement-table-block";

function collectText(node: unknown, output: string[] = []) {
	if (node === null || node === undefined || typeof node === "boolean") {
		return output;
	}
	if (typeof node === "string" || typeof node === "number") {
		output.push(String(node));
		return output;
	}
	if (Array.isArray(node)) {
		for (const child of node) collectText(child, output);
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
		collectText(element.props?.children, output);
	}
	return output;
}

function statementData(): CustomerStatementPdfData {
	return {
		title: "Customer Statement - Acme Millwork",
		printedAt: new Date("2026-08-04T12:00:00.000Z"),
		customer: {
			id: 12,
			displayName: "Acme Millwork",
		},
		companyAddress: {
			address1: "13285 SW 131 ST",
			address2: "Miami, FL 33186",
			phone: "305-278-6555",
		},
		summary: {
			orderCount: 1,
			invoiceTotal: 1200,
			paidTotal: 400,
			balanceDue: 800,
		},
		lines: [
			{
				salesId: 42,
				orderNo: "0042",
				poNo: "PO-ACME-17",
				date: "08/04/26",
				address: "100 Main St",
				invoice: 1200,
				paid: 400,
				pending: 800,
			},
		],
	};
}

describe("StatementTableBlock", () => {
	it("renders a P.O. column and the order P.O. number", () => {
		const text = collectText(StatementTableBlock({ data: statementData() }))
			.join(" ")
			.replace(/\s+/g, " ");

		expect(text).toContain("P.O.");
		expect(text).toContain("PO-ACME-17");
	});
});
