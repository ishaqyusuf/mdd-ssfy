export const SALES_NEEDS_ACTION_HREF =
	"/sales-book/orders?needsAction=open&tabName=Needs+Action";

export function getSalesNeedsActionLabel(count: number) {
	const safeCount = Math.max(0, Math.trunc(count));
	return safeCount === 1
		? "1 paid sale needs action."
		: `${safeCount} paid sales need action.`;
}
