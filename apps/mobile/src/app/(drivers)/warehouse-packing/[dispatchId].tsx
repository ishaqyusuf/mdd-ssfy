import { DispatchDetailScreen } from "@/features/dispatch/components/dispatch-detail-screen";
import { useLocalSearchParams } from "expo-router";

export default function WarehousePackingDetailRoute() {
	const params = useLocalSearchParams<{
		dispatchId?: string;
		salesNo?: string;
		openComplete?: string;
	}>();

	const dispatchId = Number(params.dispatchId || 0);
	const salesNo =
		typeof params.salesNo === "string" && params.salesNo.length > 0
			? params.salesNo
			: undefined;
	const openComplete =
		params.openComplete === "1" || params.openComplete === "true";

	return (
		<DispatchDetailScreen
			dispatchId={dispatchId}
			salesNo={salesNo}
			openCompleteOnMount={openComplete}
			entryMode="warehouse-packing"
		/>
	);
}
