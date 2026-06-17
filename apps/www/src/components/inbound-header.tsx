import { InboundSearchFilter } from "./inbound-search-filter";
import { InboundManagementColumnVisibility } from "./tables-2/inbound-management/column-visibility";

export function InboundHeader() {
	return (
		<div className="flex flex-col gap-4 xl:flex-row xl:items-center">
			<div className="min-w-0 flex-1">
				<InboundSearchFilter />
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<InboundManagementColumnVisibility />
			</div>
		</div>
	);
}
