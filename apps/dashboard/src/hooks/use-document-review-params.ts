import { parseAsInteger, useQueryStates } from "nuqs";

export function useDocumentReviewParams(options?: { shallow: boolean }) {
	const [params, setParams] = useQueryStates(
		{
			openDocumentReviewId: parseAsInteger,
		},
		options,
	);

	return {
		params,
		setParams,
		opened: Boolean(params.openDocumentReviewId),
	};
}
