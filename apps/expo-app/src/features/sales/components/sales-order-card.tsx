import type { SalesDocumentListItem } from "./sales-document-list";
import { SalesInvoiceListCard2 } from "./sales-invoice-list-card-2";

type Props = {
	item: SalesDocumentListItem;
	onPress: () => void;
};

export function SalesOrderCard({ item, onPress }: Props) {
	return <SalesInvoiceListCard2 type="order" item={item} onPress={onPress} />;
}
