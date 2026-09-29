type Row = Record<string, unknown>;
const record = (value: unknown): Row =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Row)
		: {};
const rows = (value: unknown): Row[] =>
	Array.isArray(value) ? value.map(record) : [];

export type SalesReconciliationDetail = {
	key: string;
	title: string;
	before: { qty: number; total: number; handing: string | null } | null;
	after: { qty: number; total: number; handing: string | null } | null;
};

/** Child-level evidence for the same review that approves the parent totals. */
export function getSalesReconciliationDetails(
	before: unknown[],
	after: unknown[],
): SalesReconciliationDetail[] {
	const groupedIds = new Set(
		[...before, ...after]
			.map(record)
			.filter((line) => rows(record(line.meta).mouldingRows).length)
			.map((line) => Number(line.id)),
	);
	function flatten(lines: unknown[]) {
		const result = new Map<
			string,
			{ title: string; value: NonNullable<SalesReconciliationDetail["before"]> }
		>();
		for (const line of lines.map(record)) {
			const parent = String(line.id || line.uid);
			const doors = rows(record(line.housePackageTool).doors);
			const mouldings = rows(record(line.meta).mouldingRows);
			const shelves = rows(line.shelfItems);
			const kind = doors.length
				? "door"
				: groupedIds.has(Number(line.id))
					? "moulding"
					: "shelf";
			const children = doors.length
				? doors
				: kind === "moulding"
					? mouldings.length
						? mouldings
						: [{ ...line, salesItemId: line.id }]
					: shelves;
			for (const child of children) {
				const id =
					child.salesItemId ||
					child.id ||
					`${child.dimension || child.description}|${child.stepProductId || child.productId}`;
				const key = `${parent}:${kind}:${id}`;
				result.set(key, {
					title: `${String(line.title || "Item")} · ${String(child.dimension || child.description || child.title || "Primary row")}`,
					value: {
						qty: Number(child.totalQty ?? child.qty ?? 0),
						total: Number(child.lineTotal ?? child.totalPrice ?? 0),
						handing:
							kind === "door"
								? `${Number(child.lhQty || 0)} LH / ${Number(child.rhQty || 0)} RH`
								: null,
					},
				});
			}
		}
		return result;
	}
	const oldRows = flatten(before);
	const newRows = flatten(after);
	return [...new Set([...oldRows.keys(), ...newRows.keys()])].flatMap((key) => {
		const old = oldRows.get(key);
		const next = newRows.get(key);
		return JSON.stringify(old?.value) === JSON.stringify(next?.value)
			? []
			: [
					{
						key,
						title: next?.title || old!.title,
						before: old?.value || null,
						after: next?.value || null,
					},
				];
	});
}
