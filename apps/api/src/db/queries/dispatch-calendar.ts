import type { DispatchCalendarInput } from "@api/schemas/dispatch-workspace";
import type { TRPCContext } from "@api/trpc/init";
import { getDispatchBusinessDate, getDispatchCalendarRange, resolveDispatchTimeZone } from "@gnd/sales/dispatch-manifest/driver-work-queue";
import { getDispatchCalendarPresentation, matchesDispatchCalendarStages } from "@gnd/sales";
import { getDispatches } from "./dispatch";

export async function getDispatchCalendar(ctx: TRPCContext, input: DispatchCalendarInput) {
	const timeZone = resolveDispatchTimeZone(process.env.BUSINESS_TIME_ZONE || process.env.TZ);
	const { section: _section, stages, ...filters } = input;
	const size = Math.min(100, Math.max(1, input.size ?? 100));
	const dueDate = "from" in input && "to" in input && !input.unscheduled
		? getDispatchCalendarRange(input.from, input.to, timeZone)
		: null;
	const readPage = (cursor: string | null | undefined, pageSize: number) => getDispatches(ctx, {
		...filters,
		tab: "all",
		sort: ["dueDate.asc", "id.asc"],
		size: pageSize,
		cursor,
	}, {
		dueDate,
		order: { is: { type: "order", deletedAt: null } },
	});
	let page = await readPage(input.cursor, stages?.length ? 100 : size);
	let data: Array<(typeof page.data)[number]> = page.data;
	let meta = page.meta;
	if (stages?.length) {
		const accepted: Array<(typeof page.data)[number]> = [];
		let offset = Math.max(0, Number(input.cursor) || 0);
		let nextCursor: string | null = null;
		let done = false;
		while (!done) {
			for (const [index, row] of page.data.entries()) {
				if (!matchesDispatchCalendarStages(stages, row.workspace.stage, row.pipeline?.fulfillment.state)) continue;
				if (accepted.length === size) {
					nextCursor = String(offset + index);
					done = true;
					break;
				}
				accepted.push(row);
			}
			if (done || !page.meta.cursor) break;
			offset = Number(page.meta.cursor);
			page = await readPage(page.meta.cursor, 100);
		}
		// The physical candidate count is not the filtered count.
		data = accepted;
		meta = { ...page.meta, cursor: nextCursor, count: undefined, size };
	}
	return {
		...page,
		meta: { cursor: meta.cursor, count: "count" in meta && typeof meta.count === "number" ? meta.count : undefined, size },
		timeZone,
		today: getDispatchBusinessDate(new Date(), timeZone)!,
		data: data.map(row => {
			const presentation = getDispatchCalendarPresentation(row.pipeline?.fulfillment.state, row.workspace.stage);
			return {
				...row,
				calendarDate: getDispatchBusinessDate(row.dueDate, timeZone),
				calendarCompleted: presentation.completed,
				calendarLabel: presentation.label,
				calendarTone: presentation.tone,
			};
		}),
	};
}
