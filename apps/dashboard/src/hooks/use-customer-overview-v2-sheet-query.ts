import {
	parseAsBoolean,
	parseAsJson,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";
import { z } from "zod";

import { useOnCloseQuery } from "./use-on-close-query";

export function useCustomerOverviewV2SheetQuery() {
	const onClose = useOnCloseQuery();
	const [params, setParams] = useQueryStates({
		customerOverviewV2: parseAsBoolean,
		customerOverviewV2AccountNo: parseAsString,
		customerOverviewV2Tab: parseAsStringEnum(
			["overview", "sales", "quotes", "transactions"] as const,
		),
		onCloseQuery: parseAsJson(z.any().parse),
	});

	const opened =
		params.customerOverviewV2 && !!params.customerOverviewV2AccountNo;

	return {
		params,
		setParams,
		opened,
		open(accountNo: string, tab: "overview" | "sales" | "quotes" | "transactions" = "overview", onCloseQuery?: unknown) {
			setParams({
				customerOverviewV2: true,
				customerOverviewV2AccountNo: accountNo,
				customerOverviewV2Tab: tab,
				onCloseQuery: onCloseQuery || undefined,
			});
		},
		close() {
			onClose.handle(params, setParams);
		},
	};
}
