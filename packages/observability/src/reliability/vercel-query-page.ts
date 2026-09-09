import type { VercelLogSource } from "./vercel-log";
import {
	decodeVercelLogQuery,
	prepareVercelLogQuery,
} from "./vercel-log-query";
import { prepareVercelQueryLog } from "./vercel-query-log";

export function prepareVercelQueryPage(
	output: Uint8Array,
	source: VercelLogSource,
	window: { since: Date; until: Date; limit: number },
	now: Date,
) {
	prepareVercelLogQuery({
		...window,
		account: source.account,
		project: source.project,
	});
	if (!Number.isFinite(now.getTime()) || window.until > now)
		throw new Error("Invalid Vercel query window");
	const page = decodeVercelLogQuery(output, window.limit);
	const intakes = page.records
		.map((row) => {
			if (
				typeof row.timestamp !== "number" ||
				!Number.isSafeInteger(row.timestamp) ||
				row.timestamp < window.since.getTime() ||
				row.timestamp > window.until.getTime()
			)
				throw new Error("Vercel query returned out-of-window record");
			return prepareVercelQueryLog(row, source, now);
		})
		.filter((intake) => intake !== null);
	return {
		intakes,
		saturated: page.saturated,
		recordsRead: page.records.length,
	};
}
