export const assistantSuggestionCatalog = [
	{
		id: "find-order-status",
		title: "Find an order",
		description: "Check current status, customer, and next step.",
		prompt: "Find an order and show its current status and next step.",
		requiredAny: ["viewOrders", "editOrders", "viewSales"],
	},
	{
		id: "customer-summary",
		title: "Summarize a customer",
		description: "Review authorized customer and sales context.",
		prompt: "Summarize a customer’s recent authorized account activity.",
		requiredAny: ["viewSales", "viewOrders", "editOrders"],
	},
	{
		id: "inventory-availability",
		title: "Check inventory",
		description: "Find availability for a product or component.",
		prompt: "Check inventory availability for a product or component.",
		requiredAny: ["viewOrders", "editOrders", "viewSales"],
	},
	{
		id: "create-document",
		title: "Create a document",
		description: "Prepare a PDF from authorized workspace data.",
		prompt: "Help me create a PDF document from authorized workspace data.",
		requiredAny: ["viewSales", "viewOrders", "editOrders"],
	},
] as const;

export type AssistantSuggestionId =
	(typeof assistantSuggestionCatalog)[number]["id"];

export function getAssistantSuggestions(grants: Record<string, boolean>) {
	return assistantSuggestionCatalog
		.filter((suggestion) =>
			suggestion.requiredAny.some((grant) => grants[grant]),
		)
		.slice(0, 4)
		.map(({ requiredAny: _requiredAny, ...suggestion }) => suggestion);
}
