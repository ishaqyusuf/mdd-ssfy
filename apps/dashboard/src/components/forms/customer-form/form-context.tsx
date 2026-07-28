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
}
export function FormContext({ children, data }: FormContextProps) {
	const { params, setParams } = useCreateCustomerParams();
	const defaultValues: Partial<z.input<typeof createCustomerSchema>> = {
		address1: undefined,
		formattedAddress: undefined,
		address2: undefined,
		addressId: undefined,
		businessName: undefined,
		city: undefined,
		country: undefined,
		email: undefined,
		id: undefined,
		name: undefined,
		route: undefined,
		netTerm: undefined,
		phoneNo: undefined,
		phoneNo2: undefined,
		profileId: undefined,
		state: undefined,
		zip_code: undefined,
		lat: undefined,
		placeId: undefined,
		lng: undefined,
		customerType: "Personal",
		addressOnly: !!params.address,
		addressMeta: {},
		// resolutionRequired: false,
	};

	const form = useZodForm(createCustomerSchema, {
		defaultValues,
	});
	useEffect(() => {
		if (data) {
			setParams({
				formSectionsTrigger: params?.address
					? ["address"]
					: ["general", "address"],
			});
			const formData = Object.fromEntries(
				Object.entries(data).map(([key, value]) => [key, value || undefined]),
			) as Partial<z.input<typeof createCustomerSchema>>;

			form.reset({
				...formData,
				phoneNo: formatUSPhoneNumber(formData.phoneNo),
				phoneNo2: formatUSPhoneNumber(formData.phoneNo2),
				addressOnly: !!params.address,
			});
		} else if (params.search) {
			const search = params.search.trim();
			form.reset({
				...(isPhoneLikeSearch(search)
					? { phoneNo: formatUSPhoneNumber(search) }
					: { name: search }),
			});
		}
	}, [data, params?.address, params.search, form, setParams]);

	return <FormProvider {...form}>{children}</FormProvider>;
}

export const useCustomerForm = () =>
	useFormContext<z.infer<typeof createCustomerSchema>>();
