type SalesFormHeaderTitleInput = {
	type: "order" | "quote";
	orderId?: string | null;
	isSaved?: boolean;
	createdAt?: string | null;
};

function formatDocumentDate(value?: string | null) {
	if (!value) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
	if (!match) return null;
	const [, year, month, day] = match;
	if (!year || !month || !day) return null;
	return `${month}/${day}/${year.slice(-2)}`;
}

export function buildSalesFormHeaderTitle(input: SalesFormHeaderTitleInput) {
	if (!input.orderId) return `New ${input.type}`;
	if (!input.isSaved) return `Editing ${input.type} ${input.orderId}`;

	const documentDate = formatDocumentDate(input.createdAt);
	return documentDate
		? `#${input.orderId} ${documentDate}`
		: `#${input.orderId}`;
}
