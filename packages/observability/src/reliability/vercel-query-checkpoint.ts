type Window = [number, number];

export function resumeVercelQueryWindows(checkpoint: {
	windowStart: string;
	windowEnd: string;
	cursor: string | null;
}): Window[] {
	const start = Date.parse(checkpoint.windowStart);
	const end = Date.parse(checkpoint.windowEnd);
	if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
		throw new Error("Invalid Vercel discovery bounds");
	if (checkpoint.cursor === null) return [[start, end]];
	if (checkpoint.cursor.length > 2048)
		throw new Error("Invalid Vercel discovery checkpoint");
	const pending: unknown = JSON.parse(checkpoint.cursor);
	if (!Array.isArray(pending) || !pending.length || pending.length > 50)
		throw new Error("Invalid Vercel discovery checkpoint");
	let previousEnd: number | undefined;
	const windows = pending.map((value): Window => {
		if (
			!Array.isArray(value) ||
			value.length !== 2 ||
			!Number.isSafeInteger(value[0]) ||
			!Number.isSafeInteger(value[1]) ||
			value[0] < start ||
			value[1] > end ||
			value[0] >= value[1] ||
			(previousEnd !== undefined && value[0] !== previousEnd)
		)
			throw new Error("Invalid Vercel discovery checkpoint");
		previousEnd = value[1];
		return [value[0], value[1]];
	});
	if (previousEnd !== end) throw new Error("Invalid Vercel discovery checkpoint");
	return windows;
}

/** Persist returned cursor only after every occurrence in the queried window commits. */
export function advanceVercelQueryWindows(
	pending: Window[],
	saturated: boolean,
): string | null {
	const current = pending[0];
	if (!current) throw new Error("Invalid Vercel discovery checkpoint");
	let next = pending.slice(1);
	if (saturated) {
		const [start, end] = current;
		if (end - start <= 1) throw new Error("VERCEL_QUERY_DENSITY_EXCEEDED");
		const middle = start + Math.floor((end - start) / 2);
		// Shared boundary is deliberate; occurrence identity deduplicates repeats.
		next = [[start, middle], [middle, end], ...next];
	}
	if (!next.length) return null;
	const cursor = JSON.stringify(next);
	if (cursor.length > 2048 || next.length > 50)
		throw new Error("VERCEL_QUERY_CHECKPOINT_EXCEEDED");
	return cursor;
}
