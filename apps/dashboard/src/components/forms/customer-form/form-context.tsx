import { useZodForm } from "@/hooks/use-zod-form";
import { useEffect } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import type { z } from "zod";

import { createCustomerSchema } from "@/actions/schema";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { formatUSPhoneNumber, isPhoneLikeSearch } from "@gnd/utils/format";

interface FormContextProps {
	children?;
	data?;
	formParams?: CustomerFormParams;
}
export type CustomerFormParams = {
	address?: "sad" | "bad" | null;
	addressId?: number | null;
	billingAddressId?: number | null;
	customerForm?: boolean | null;
	customerId?: number | null;
	formSectionsTrigger?: string[];
	salesId?: number | null;
	salesType?: "order" | "quote" | null;
	search?: string | null;
	shippingAddressId?: number | null;
};

export function FormContext({ children, data, formParams }: FormContextProps) {
	const customerParams = useCreateCustomerParams();
	const params = formParams ?? (customerParams.params as CustomerFormParams);
	const setParams = customerParams.setParams;
	const defaultValues: Partial<z.infer<typeof createCustomerSchema>> = {
		salesId: params.salesId ?? undefined,
		salesType: params.salesType ?? undefined,
		shippingSameAsBilling: true,
		billingAddress: {
			address1: "",
			address2: "",
			city: "",
			country: "",
			formattedAddress: "",
			placeId: "",
			state: "",
			zip_code: "",
		},
		shippingAddress: {
			address1: "",
			address2: "",
			city: "",
			country: "",
			formattedAddress: "",
			placeId: "",
			state: "",
			zip_code: "",
		},
		address1: "",
		formattedAddress: "",
		address2: "",
		addressId: undefined,
		businessName: "",
		city: "",
		country: "",
		email: "",
		id: undefined,
		name: "",
		route: "",
		netTerm: undefined,
		phoneNo: "",
		phoneNo2: "",
		profileId: undefined,
		state: "",
		zip_code: "",
		lat: undefined,
		placeId: undefined,
		lng: undefined,
		customerType: "Personal",
		addressOnly: !!params.address,
		addressMeta: {},
		existingCustomers: [],
		// resolutionRequired: false,
	};

	const form = useZodForm(createCustomerSchema, {
		defaultValues,
	});
	useEffect(() => {
		if (data) {
			if (!formParams) {
				setParams({
					formSectionsTrigger: params?.address
						? ["address"]
						: ["general", "address"],
				});
			}
			const formData = Object.fromEntries(
				Object.entries(data).map(([key, value]) => [key, value ?? undefined]),
			) as Partial<z.infer<typeof createCustomerSchema>>;

			form.reset({
				...formData,
				phoneNo: formatUSPhoneNumber(formData.phoneNo),
				phoneNo2: formatUSPhoneNumber(formData.phoneNo2),
				addressOnly: !!params.address,
				salesId: params.salesId ?? undefined,
				salesType: params.salesType ?? undefined,
			});
		} else if (params.search) {
			const search = params.search.trim();
			form.reset({
				...(isPhoneLikeSearch(search)
					? { phoneNo: formatUSPhoneNumber(search) }
					: { name: search }),
			});
		}
	}, [
		data,
		formParams,
		params?.address,
		params.salesId,
		params.salesType,
		params.search,
		form,
		setParams,
	]);

	return <FormProvider {...form}>{children}</FormProvider>;
}

export const useCustomerForm = () =>
	useFormContext<z.infer<typeof createCustomerSchema>>();
