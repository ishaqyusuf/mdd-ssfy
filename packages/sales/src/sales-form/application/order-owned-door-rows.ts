/** Imported data can retain door references to a missing house package ID.
 * Reusing that ID must not bring another order's doors into the current form.
 */
export function orderOwnedDoorRows<T extends { salesOrderId?: number | null }>(
	rows: T[],
	salesOrderId: number,
) {
	return rows.filter(
		(row) =>
			row.salesOrderId === undefined || row.salesOrderId === salesOrderId,
	);
}
