export type PreviewKind = "sales" | "order" | "pdf" | "request";
export const suggestions: {
	title: string;
	description: string;
	prompt: string;
	kind: PreviewKind;
}[] = [
	{
		title: "See the bigger picture",
		description: "Turn sales activity into a clear report",
		prompt: "Show my weekly sales performance",
		kind: "sales",
	},
	{
		title: "Find an order",
		description: "Status, materials, and what happens next",
		prompt: "Where is order DEMO-1042?",
		kind: "order",
	},
	{
		title: "Prepare a document",
		description: "Invoices and PDFs, all in one place",
		prompt: "Prepare an invoice PDF for DEMO-1042",
		kind: "pdf",
	},
	{
		title: "Shape what comes next",
		description: "Tell us what you wish GND could do",
		prompt: "Automatically forecast material demand",
		kind: "request",
	},
];
export const salesData = [
	{ week: "Aug 3", sales: 18400 },
	{ week: "Aug 10", sales: 24600 },
	{ week: "Aug 17", sales: 21200 },
	{ week: "Aug 24", sales: 31800 },
	{ week: "Aug 31", sales: 27400 },
	{ week: "Sep 7", sales: 36200 },
];
export function previewKind(prompt: string): PreviewKind {
	if (/pdf|invoice|document/i.test(prompt)) return "pdf";
	if (/order|status|delivery/i.test(prompt)) return "order";
	if (/sales|chart|revenue|performance/i.test(prompt)) return "sales";
	return "request";
}
