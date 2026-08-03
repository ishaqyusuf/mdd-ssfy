"use client";

import AddressAutoComplete from "@/components/address-autocomplete";
import { useState } from "react";
import FormInput from "../../common/controls/form-input";
import type { CustomerFormData } from "./customer-form";
import { useCustomerForm } from "./form-context";

type AddressPrefix = "billingAddress" | "shippingAddress" | null;

function fieldName(prefix: AddressPrefix, field: string) {
	return (prefix ? `${prefix}.${field}` : field) as never;
}

export function CustomerAddressFields({
	prefix = null,
}: {
	prefix?: AddressPrefix;
}) {
	const form = useCustomerForm();
	const [searchInput, setSearchInput] = useState("");
	const setAddressValue = (
		field: keyof NonNullable<CustomerFormData["billingAddress"]>,
		value: unknown,
	) => {
		form.setValue(fieldName(prefix, field), value as never, {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	return (
		<div className="space-y-4">
			<AddressAutoComplete
				searchInput={searchInput}
				setSearchInput={setSearchInput}
				dialogTitle="Search Address"
				setAddress={(address) => {
					setAddressValue("formattedAddress", address.formattedAddress);
					setAddressValue("address1", address.address1);
					setAddressValue("address2", address.address2);
					setAddressValue("city", address.city);
					setAddressValue("state", address.region);
					setAddressValue("zip_code", address.postalCode);
					setAddressValue("country", address.country);
					setAddressValue("lat", address.lat);
					setAddressValue("lng", address.lng);
				}}
			/>
			<FormInput
				control={form.control}
				name={fieldName(prefix, "address1")}
				label="Address Line 1"
				size="sm"
			/>
			<FormInput
				control={form.control}
				name={fieldName(prefix, "route")}
				label="Route"
				size="sm"
			/>
			<FormInput
				control={form.control}
				name={fieldName(prefix, "address2")}
				label="Address Line 2"
				size="sm"
			/>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<FormInput
					control={form.control}
					name={fieldName(prefix, "city")}
					label="City"
					size="sm"
				/>
				<FormInput
					control={form.control}
					name={fieldName(prefix, "state")}
					label="State / Province"
					size="sm"
				/>
				<FormInput
					control={form.control}
					name={fieldName(prefix, "zip_code")}
					label="Zip Code / Postal Code"
					size="sm"
				/>
				<FormInput
					control={form.control}
					name={fieldName(prefix, "country")}
					label="Country"
					size="sm"
				/>
			</div>
		</div>
	);
}
