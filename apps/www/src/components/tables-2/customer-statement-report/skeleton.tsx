import { TableSkeleton } from "@/components/tables-2/core";
import { cn } from "@/lib/utils";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import type { TableSettings } from "@/utils/table-settings";

import { columns } from "./columns";

const tableConfig = TABLE_CONFIGS["customer-statement-report"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	rowCount?: number;
	isEmpty?: boolean;
	className?: string;
};

export function CustomerStatementReportSkeleton({
	initialSettings,
	rowCount = 6,
	isEmpty,
	className,
}: Props) {
	return (
		<div className={cn("min-h-0", className)}>
			<TableSkeleton
				columns={columns}
				rowCount={rowCount}
				isEmpty={isEmpty}
				columnVisibility={initialSettings?.columns}
				columnSizing={initialSettings?.sizing}
				columnOrder={initialSettings?.order}
				tableConfig={tableConfig}
			/>
		</div>
	);
}
