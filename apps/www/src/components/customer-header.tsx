"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";

import { CustomerSearchFilter } from "./customer-search-filter";

export function CustomerHeader() {
	const { setParams } = useCreateCustomerParams();

	return (
		<div className="flex flex-col gap-4 rounded-xl border bg-background p-4 sm:p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold tracking-tight">
						Customer Directory
					</h2>
					<p className="text-sm text-muted-foreground">
						Search by customer, phone number, or account details to jump into
						the sales workspace quickly.
					</p>
				</div>
				<Button
					className="sm:self-start"
					onClick={() => {
						setParams({
							customerForm: true,
							customerId: null,
							addressId: null,
							address: null,
						});
					}}
				>
					<Icons.Add className="mr-2 h-4 w-4" />
					Create Customer
				</Button>
			</div>
			<CustomerSearchFilter />
		</div>
	);
}
