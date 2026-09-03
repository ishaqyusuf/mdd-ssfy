export function getSalesOrderPoBadgeValue(
	poNo: string | null | undefined,
): string | null {
	const value = poNo?.trim();
	return value && value !== "-" ? value : null;
}
