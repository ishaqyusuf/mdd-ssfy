export type DriverWorkQueueDueBucket =
	| "overdue"
	| "today"
	| "tomorrow"
	| "upcoming"
	| "unscheduled";

export type DriverWorkQueueModelItem = {
	id: number;
	dueBucket?: DriverWorkQueueDueBucket | null;
	[key: string]: unknown;
};

export function buildDriverWorkQueueSections<
	T extends DriverWorkQueueModelItem,
>(items: readonly T[]) {
	const sectionDefinitions = [
		{ title: "Overdue", buckets: ["overdue"] },
		{ title: "Due Today", buckets: ["today"] },
		{ title: "Tomorrow", buckets: ["tomorrow"] },
		{ title: "Upcoming", buckets: ["upcoming"] },
		{ title: "Needs Scheduling", buckets: ["unscheduled"] },
	] as const;

	return sectionDefinitions
		.map((section) => ({
			title: section.title,
			data: items.filter((item) =>
				section.buckets.some((bucket) => bucket === item.dueBucket),
			),
		}))
		.filter((section) => section.data.length > 0);
}
