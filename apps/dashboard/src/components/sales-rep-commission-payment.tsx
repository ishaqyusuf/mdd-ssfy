import { CommissionPaymentsWidget } from "@/components/widgets/commission-payments";
import type { TableSettings } from "@/utils/table-settings";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export default function CommissionPayments({ initialSettings }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Commission Payments</CardTitle>
				<CardDescription>History of your commission payments</CardDescription>
			</CardHeader>
			<CardContent>
				<CommissionPaymentsWidget initialSettings={initialSettings} />
			</CardContent>
		</Card>
	);
}
