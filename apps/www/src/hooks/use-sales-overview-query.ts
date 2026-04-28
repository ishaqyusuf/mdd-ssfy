import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import {
	parseAsInteger,
	parseAsJson,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";
import { z } from "zod";

import { useAuth } from "./use-auth";
import { useOnCloseQuery } from "./use-on-close-query";
import { useSalesQueryClient } from "./use-sales-query-client";

const openModes = [
	"quote",
	"sales",
	"sales-production",
	"dispatch-modal",
	"production-tasks",
] as const;
type Modes = (typeof openModes)[number];
export function useSalesOverviewQuery() {
	const onCloseQuery = useOnCloseQuery();
	const [params, setParams] = useQueryStates({
		"sales-overview-id": parseAsString,
		"sales-type": parseAsStringEnum(["quote", "order"] as SalesType[]),
		mode: parseAsStringEnum([...openModes]),
		"prod-item-view": parseAsString,
		"prod-item-tab": parseAsStringEnum(["assignments", "details", "notes"]),
		onCloseQuery: parseAsJson(z.any().parse),
		dispatchId: parseAsInteger,
		salesTab: parseAsStringEnum([
			"general",
			"production",
			"transaction",
			"transactions",
			"activity",
			"inbound",
			"dispatch",
			"notification",
			"packing",
		] as const),
		// refreshTok: parseAsString,
		dispatchOverviewId: parseAsInteger,
	});
	const auth = useAuth();
	const assignedTo =
		auth?.can?.viewProduction && !auth?.can?.viewOrders ? auth?.id : null;
	const viewMode =
		auth?.can?.viewProduction && !auth?.can?.viewOrders
			? "production-tasks"
			: auth?.can?.viewDelivery && !auth?.can?.viewOrders
				? "dispatch-modal"
				: "general";
	const salesQuery = useSalesQueryClient();
	return {
		...params,
		viewMode,
		dispatchMode: !!params.dispatchId,
		salesQuery,
		params,
		assignedTo,
		close() {
			setParams(null);
			onCloseQuery.handle(params, setParams);
		},
		// _refreshToken() {
		//     // setParams({
		//     //     refreshTok: generateRandomString(),
		//     // });
		// },
		setParams,
		openDispatch(
			orderNo: string,
			dispatchId,
			salesTab: typeof params.salesTab,
		) {
			setParams({
				"sales-overview-id": orderNo,
				"sales-type": "order",
				mode: "dispatch-modal",
				salesTab,
				dispatchId,
			});
		},
		open2(orderNo: string, mode: Modes) {
			const salesType: SalesType = mode === "quote" ? "quote" : "order";
			const resolvedMode = assignedTo ? "production-tasks" : mode;
			setParams({
				"sales-overview-id": orderNo,
				"sales-type": salesType,
				mode: resolvedMode,
				salesTab: assignedTo ? "production" : "general",
			});
		},
	};
}
