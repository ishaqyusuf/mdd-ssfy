import { SalesDocumentOverviewScreen } from "@/features/sales/components/sales-order-detail-screen";
import { useLocalSearchParams } from "expo-router";

export default function SalesQuoteDetailRoute() {
	const params = useLocalSearchParams<{ quoteNo?: string }>();
	const quoteNo = typeof params.quoteNo === "string" ? params.quoteNo : "";

	return <SalesDocumentOverviewScreen documentNo={quoteNo} type="quote" />;
}
