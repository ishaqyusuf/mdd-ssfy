import { parseAsInteger, useQueryStates } from "nuqs";

export function useContractorPayoutParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			openContractorPayoutId: parseAsInteger,
		},
		options,
	);

	return {
		...params,
		setParams,
		opened: !!params.openContractorPayoutId,
	};
}
