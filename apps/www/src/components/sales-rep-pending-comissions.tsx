import { ComissionsWidget } from "@/components/widgets/comissions";
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

export default function PendingCommissions({ initialSettings }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Pending Commissions</CardTitle>
				<CardDescription>
					Commissions awaiting processing and payment
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ComissionsWidget initialSettings={initialSettings} />
			</CardContent>
		</Card>
	);
}
