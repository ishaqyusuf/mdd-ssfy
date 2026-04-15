/**
 * Sales Print V2 — Typed contracts
 *
 * Templates receive PrintPage payloads and never touch the database.
 */

// ─── Print Modes ─────────────────────────────────────────────

export type PrintMode =
	| "invoice"
	| "quote"
	| "production"
	| "packing-slip"
	| "order-packing";

// ─── Page-level ──────────────────────────────────────────────

export interface PrintPage {
	meta: PageMeta;
	billing: AddressBlock | null;
	shipping: AddressBlock | null;
	sections: PrintSection[];
	footer: FooterData | null;
	config: PrintModeConfig;
	signing: PrintSigningData | null;
}

export interface PageMeta {
	title: string;
	salesNo: string;
	date: string;
	rep?: string;
	po?: string;
	status: "paid" | "pending";
	balanceDue?: string;
	dueDate?: string;
	total: string;
	paymentDate?: string;
	goodUntil?: string;
}

export interface AddressBlock {
	title: string;
	lines: string[];
}

export interface PrintModeConfig {
	mode: PrintMode;
	showPrices: boolean;
	showFooter: boolean;
	showPackingCol: boolean;
	showSignature: boolean;
	showImages: boolean;
}

export interface PrintSigningData {
	dispatchId: number | null;
	customerName: string | null;
	packedBy: string | null;
	receivedBy: string | null;
	signatureUrl: string | null;
	signedAt: string | null;
}

// ─── Sections (discriminated union) ──────────────────────────

export type PrintSection =
	| DoorSection
	| MouldingSection
	| ServiceSection
	| ShelfSection
	| LineItemSection;

// ─── Door Section ────────────────────────────────────────────

export interface DoorSection {
	kind: "door";
	index: number;
	title: string;
	details: SectionDetail[];
	headers: CellHeader[];
	rows: DoorRow[];
}

export interface SectionDetail {
	label: string;
	value: string;
}

export interface CellHeader {
	title: string;
	key: string | null;
	colSpan: number;
	align?: "left" | "center" | "right";
}

export interface DoorRow {
	cells: RowCell[];
}

export interface RowCell {
	value: string | number | null;
	colSpan: number;
	align?: "left" | "center" | "right";
	bold?: boolean;
	image?: string | null;
}

// ─── Moulding Section ────────────────────────────────────────

export interface MouldingSection {
	kind: "moulding";
	index: number;
	title: string;
	headers: CellHeader[];
	rows: MouldingRow[];
}

export interface MouldingRow {
	cells: RowCell[];
}

// ─── Service Section ─────────────────────────────────────────

export interface ServiceSection {
	kind: "service";
	index: number;
	title: string;
	headers: CellHeader[];
	rows: ServiceRow[];
}

export interface ServiceRow {
	cells: RowCell[];
}

// ─── Shelf Section ───────────────────────────────────────────

export interface ShelfSection {
	kind: "shelf";
	index: number;
	title: string;
	headers: CellHeader[];
	rows: ShelfRow[];
}

export interface ShelfRow {
	cells: RowCell[];
}

// ─── Line Item Section ───────────────────────────────────────

export interface LineItemSection {
	kind: "line-item";
	index: number;
	title: string;
	headers: CellHeader[];
	rows: LineItemRow[];
}

export interface LineItemRow {
	cells: RowCell[];
	isGroupHeader?: boolean;
}

// ─── Footer ──────────────────────────────────────────────────

export interface FooterData {
	lines: FooterLine[];
	notes: string[];
}

export interface FooterLine {
	label: string;
	value: string;
	bold?: boolean;
	large?: boolean;
}

// ─── Company Address ─────────────────────────────────────────

export interface CompanyAddress {
	address1: string;
	address2: string;
	phone: string;
	fax?: string;
}

// ─── Template Props ──────────────────────────────────────────

export interface SalesTemplateProps {
	page: PrintPage;
	baseUrl?: string;
	watermark?: string;
	logoUrl?: string;
	companyAddress: CompanyAddress;
}
