import {
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	useQueryStates,
} from "nuqs";

export function useProjectUnitParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			openProjectUnitId: parseAsInteger,
		},
		options,
	);
	const opened = !!params.openProjectUnitId;
	return {
		...params,
		setParams,
		opened,
	};
}
