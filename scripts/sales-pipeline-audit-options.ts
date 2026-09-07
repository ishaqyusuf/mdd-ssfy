export function readOperationalDate(args: string[], fallback: string) {
	const index = args.indexOf("--operational-date");
	const value = index < 0 ? fallback : args[index + 1];
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error("--operational-date requires a real YYYY-MM-DD date.");
	}
	const parsed = new Date(`${value}T00:00:00.000Z`);
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.toISOString().slice(0, 10) !== value
	) {
		throw new Error("--operational-date requires a real YYYY-MM-DD date.");
	}
	return value;
}

export function buildOperationalDateListFilter(
	operationalDate: string,
	runtimeOperationalDate: string,
) {
	return operationalDate === runtimeOperationalDate
		? ({ due: "today" } as const)
		: ({ productionDueDate: operationalDate } as const);
}

export async function collectPaginatedUniqueOrderIds(
	readPage: (cursor?: string | number | null) => Promise<{
		data: Array<{ id: number }>;
		meta?: { cursor?: string | number | null };
	}>,
	maxPages: number,
) {
	const orderIds = new Set<number>();
	const seenCursors = new Set<string>();
	let cursor: string | number | null | undefined;
	let pageCount = 0;
	let truncated = false;
	while (pageCount < maxPages) {
		const page = await readPage(cursor);
		pageCount += 1;
		for (const row of page.data) orderIds.add(row.id);
		const nextCursor = page.meta?.cursor;
		if (nextCursor == null || nextCursor === "") break;
		const cursorKey = String(nextCursor);
		if (seenCursors.has(cursorKey)) {
			truncated = true;
			break;
		}
		seenCursors.add(cursorKey);
		cursor = nextCursor;
		if (pageCount === maxPages) truncated = true;
	}
	return {
		orderIds: Array.from(orderIds).sort((left, right) => left - right),
		pageCount,
		truncated,
	};
}
