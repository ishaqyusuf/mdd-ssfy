import {
	type DoorPriceRow,
	updateDoorRowBasePrice,
} from "./door-price-update";

export function getDoorSizeDialogSessionKey(input: {
	open: boolean;
	lineUid?: string | null;
	componentId?: number | null;
	componentUid?: string | null;
	supplierUid?: string | null;
	profileCoefficient?: number | null;
}) {
	if (!input.open) return null;
	return [
		String(input.lineUid || ""),
		String(input.componentId || ""),
		String(input.componentUid || ""),
		String(input.supplierUid || ""),
		String(input.profileCoefficient ?? ""),
	].join("|");
}

export function updateDoorSizeDialogRowBasePrice<T extends DoorPriceRow>(
	rows: T[],
	rowIndex: number,
	nextBase: number,
	profileCoefficient?: number | null,
) {
	return rows.map((row, index) =>
		index === rowIndex
			? updateDoorRowBasePrice(row, nextBase, profileCoefficient)
			: row,
	);
}
