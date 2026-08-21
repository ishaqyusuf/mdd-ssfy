import {
	addMonths,
	addWeeks,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isValid,
	parseISO,
	startOfMonth,
	startOfWeek,
} from "date-fns";

export const operationsCalendarViews = ["week", "month"] as const;
export type OperationsCalendarView = (typeof operationsCalendarViews)[number];

const WEEK_STARTS_ON = 1;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function resolveOperationsCalendarDate(value?: string | null) {
	if (value && DATE_PATTERN.test(value)) {
		const parsed = parseISO(value);
		if (isValid(parsed)) return parsed;
	}

	return new Date();
}

export function getOperationsCalendarPeriod(
	date: Date,
	view: OperationsCalendarView,
) {
	const start =
		view === "month"
			? startOfWeek(startOfMonth(date), { weekStartsOn: WEEK_STARTS_ON })
			: startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
	const end =
		view === "month"
			? endOfWeek(endOfMonth(date), { weekStartsOn: WEEK_STARTS_ON })
			: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });

	return {
		start,
		end,
		days: eachDayOfInterval({ start, end }),
		from: format(start, "yyyy-MM-dd"),
		to: format(end, "yyyy-MM-dd"),
	};
}

export function moveOperationsCalendarDate(
	date: Date,
	view: OperationsCalendarView,
	direction: number,
) {
	return view === "month"
		? addMonths(date, direction)
		: addWeeks(date, direction);
}

export function formatOperationsCalendarPeriodLabel(
	date: Date,
	view: OperationsCalendarView,
) {
	if (view === "month") return format(date, "MMMM yyyy");

	const { start, end } = getOperationsCalendarPeriod(date, "week");
	return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function getOperationsCalendarPeriodOptions(
	date: Date,
	view: OperationsCalendarView,
) {
	const radius = view === "week" ? 10 : 4;

	return Array.from({ length: radius * 2 + 1 }, (_, index) => {
		const offset = index - radius;
		const optionDate = moveOperationsCalendarDate(date, view, offset);

		return {
			date: optionDate,
			label: formatOperationsCalendarPeriodLabel(optionDate, view),
			selected: offset === 0,
		};
	});
}
