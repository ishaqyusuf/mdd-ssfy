"use client";

import { Button } from "@gnd/ui/button";
import {
	buildDevAddress,
	buildDevEmail,
	buildDevPhone,
	createDevFormFillSeed,
} from "@gnd/utils/form-fill";
import { type UseFormReturn, useFormContext } from "react-hook-form";

import type { CustomerFormData } from "../forms/customer-form/customer-form";

export type CustomerFormQuickFillArgs = {
	customerType?: "Personal" | "Business";
	defaultProfileId?: string;
	defaultTaxCode?: string;
	addressOnly?: boolean;
};

type QuickFillRegistry = {
	customerForm: {
		args: CustomerFormQuickFillArgs;
		values: CustomerFormData;
	};
};

type QuickFillName = keyof QuickFillRegistry;

type QuickFillProps<Name extends QuickFillName> = {
	name: Name;
	args: QuickFillRegistry[Name]["args"];
};

function applyCustomerFormQuickFill(
	form: UseFormReturn<CustomerFormData>,
	args: CustomerFormQuickFillArgs,
) {
	const current = form.getValues();
	const seed = createDevFormFillSeed("customer");
	const customerType =
		args.customerType ||
		current.customerType ||
		(args.addressOnly ? "Personal" : "Business");
	const contactName = `Dev ${seed.label}`;
	const businessName = `Dev ${seed.label} Millwork`;

	form.reset({
		...current,
		addressOnly: args.addressOnly ?? current.addressOnly ?? false,
		customerType,
		profileId: current.profileId || args.defaultProfileId || undefined,
		taxCode: current.taxCode || args.defaultTaxCode || undefined,
		netTerm: current.netTerm || "Net 30",
		name: customerType === "Business" ? contactName : contactName,
		businessName: customerType === "Business" ? businessName : undefined,
		email: buildDevEmail(
			seed,
			customerType === "Business" ? "customer" : "person",
		),
		phoneNo: buildDevPhone(seed),
		phoneNo2: buildDevPhone(createDevFormFillSeed("customer-alt")),
		formattedAddress: `${buildDevAddress(seed)}, Austin, TX 78701, USA`,
		address1: buildDevAddress(seed),
		address2: `Suite ${seed.numeric.slice(-3)}`,
		route: `Route ${seed.numeric.slice(-2)}`,
		city: "Austin",
		state: "TX",
		zip_code: `78${seed.numeric.slice(-3)}`,
		country: "USA",
		lat: 30.2672,
		lng: -97.7431,
		placeId: seed.id,
		existingCustomers: undefined,
	});
}

const QUICK_FILLERS = {
	customerForm: applyCustomerFormQuickFill,
} satisfies {
	[K in QuickFillName]: (
		form: UseFormReturn<QuickFillRegistry[K]["values"]>,
		args: QuickFillRegistry[K]["args"],
	) => void;
};

export function QuickFill<Name extends QuickFillName>({
	name,
	args,
}: QuickFillProps<Name>) {
	const form = useFormContext<QuickFillRegistry[Name]["values"]>();

	if (process.env.NODE_ENV === "production") return null;

	function handleFill() {
		const apply = QUICK_FILLERS[name] as (
			form: UseFormReturn<QuickFillRegistry[Name]["values"]>,
			args: QuickFillRegistry[Name]["args"],
		) => void;
		apply(form, args);
	}

	return (
		<Button type="button" size="sm" variant="outline" onClick={handleFill}>
			Quick Fill
		</Button>
	);
}
