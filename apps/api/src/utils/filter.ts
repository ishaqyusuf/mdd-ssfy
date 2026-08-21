import type { PageFilterData, PageFilterOption } from "@api/type";

export function optionFilter<TFilterKey, TOptionValue = unknown>(
	value: TFilterKey,
	label: string,
	options: Array<PageFilterOption<TOptionValue> | string>,
) {
	const normalizedOptions: PageFilterOption<TOptionValue | string>[] = options.map(
		(option) =>
			typeof option === "string"
				? { label: option, value: option }
				: {
						label: option.label,
						value: option.value,
						...(option.subLabel === undefined
							? {}
							: { subLabel: option.subLabel }),
						...(option.color === undefined ? {} : { color: option.color }),
					},
	);

	return {
		label,
		value,
		options: normalizedOptions,
		type: "checkbox",
	} satisfies PageFilterData<TFilterKey, TOptionValue | string>;
}
export function dateFilter<T>(value: T, label: string) {
	return {
		label,
		value,
		type: "date",
	} satisfies PageFilterData<T>;
}
export function dateRangeFilter<T>(value: T, label: string) {
	return {
		label,
		value,
		type: "date-range",
	} satisfies PageFilterData<T>;
}
const searchFilter = {
	label: "Search",
	type: "input",
	value: "q",
} as PageFilterData<"q">;
