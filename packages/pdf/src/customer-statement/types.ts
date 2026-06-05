import type { CompanyAddress } from "@gnd/sales/print/types";

export interface CustomerStatementPdfLine {
	salesId: number;
	orderNo: string;
	date: string;
	address?: string | null;
	invoice: number;
	paid: number;
	pending: number;
}

export interface CustomerStatementPdfData {
	title: string;
	printedAt: Date | string;
	customer: {
		id: number;
		displayName: string;
		email?: string | null;
		phoneNo?: string | null;
		phoneNo2?: string | null;
		accountNo?: string | null;
		address?: string | null;
	};
	companyAddress: CompanyAddress;
	logoUrl?: string | null;
	paymentLink?: string | null;
	summary: {
		orderCount: number;
		invoiceTotal: number;
		paidTotal: number;
		balanceDue: number;
	};
	lines: CustomerStatementPdfLine[];
}
