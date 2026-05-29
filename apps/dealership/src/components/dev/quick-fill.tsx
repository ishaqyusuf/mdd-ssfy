"use client";

import { Button } from "@gnd/ui/button";
import { faker } from "@faker-js/faker";
import { useFormContext } from "react-hook-form";

import type { DealerPortalCustomerSchema } from "@api/schemas/dealer";

type CustomerQuickFillProps = {
	defaultProfileId?: number | null;
	defaultTaxCode?: string | null;
};

export function CustomerQuickFill({
	defaultProfileId,
	defaultTaxCode,
}: CustomerQuickFillProps) {
	const form = useFormContext<DealerPortalCustomerSchema>();

	if (process.env.NODE_ENV === "production") return null;

	function handleFill() {
		const current = form.getValues();
		const name = faker.person.fullName();

		form.reset({
			...current,
			name,
			businessName: faker.company.name(),
			email: faker.internet.email({ firstName: name }).toLowerCase(),
			phoneNo: faker.phone.number(),
			address: faker.location.streetAddress({ useFullAddress: true }),
			customerTypeId: current.customerTypeId || defaultProfileId || null,
			taxCode: current.taxCode || defaultTaxCode || null,
		});
	}

	return (
		<Button onClick={handleFill} type="button" variant="outline">
			Quick random fill
		</Button>
	);
}
