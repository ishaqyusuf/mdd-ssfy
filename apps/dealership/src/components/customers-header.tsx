"use client";

import { useCustomerFormParams } from "@/hooks/use-customer-form-params";
import type { PageFilterData } from "@api/type";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { CustomersSearchFilter } from "./customers-search-filter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function CustomersHeader({ initialFilterList }: Props) {
	const customerForm = useCustomerFormParams();

	return (
		<div className="flex items-center gap-4">
			<CustomersSearchFilter initialFilterList={initialFilterList} />
			<div className="flex-1" />
			<Button onClick={() => customerForm.openCreate()} type="button">
				<Icons.Add className="mr-2 size-4" />
				<span className="hidden lg:inline">New</span>
			</Button>
		</div>
	);
}
