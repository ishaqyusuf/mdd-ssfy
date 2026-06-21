import { SalesDocumentCard } from "./sales-document-card";

type Props = {
  item: any;
  onPress: () => void;
};

export function SalesOrderCard({ item, onPress }: Props) {
  return <SalesDocumentCard type="order" item={item} onPress={onPress} />;
}
