"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";

import { CustomerSearchFilter } from "./customer-search-filter";
import { CustomersColumnVisibility } from "./tables-2/customers/column-visibility";

export function CustomerHeader() {
	const { setParams } = useCreateCustomerParams();

	return (
		<div className="flex flex-col gap-4 xl:flex-row xl:items-center">
			<div className="min-w-0 flex-1">
				<CustomerSearchFilter />
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<CustomersColumnVisibility />
				<Button
					onClick={() => {
						setParams({
							customerForm: true,
							customerId: null,
							addressId: null,
							address: null,
						});
					}}
				>
					<Icons.add className="mr-2 h-4 w-4" />
					<span className="hidden lg:inline">Create Customer</span>
				</Button>
			</div>
		</div>
	);
}
