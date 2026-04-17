"use client";

import type { createCustomerSchema } from "@/actions/schema";
import AddressAutoComplete from "@/components/address-autocomplete";
import { QuickFill } from "@/components/dev/quick-fill";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useTRPC } from "@/trpc/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Field } from "@gnd/ui/namespace";
import salesData from "@sales/sales-data";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import type { z } from "zod";
import FormInput from "../../common/controls/form-input";
import FormSelect from "../../common/controls/form-select";
import { ExistingCustomerResolver } from "./existing-customer-resolver";
import { useCustomerForm } from "./form-context";

export type CustomerFormData = z.infer<typeof createCustomerSchema>;

export function CustomerForm() {
	const { params } = useCreateCustomerParams();
	const sections = params.formSectionsTrigger;
	const form = useCustomerForm();
	const trpc = useTRPC();
	const { data: taxProfiles } = useQuery(
		trpc.customers.getTaxProfiles.queryOptions(),
	);
	const { data: salesProfiles } = useQuery(
		trpc.customers.getCustomerProfiles.queryOptions(),
	);
	// const resp = useEffectLoader(
	//     async () => {
	//         const re = {
	//             taxProfiles: await getTaxProfilesAction(),
	//             salesProfiles: await getCustomerProfilesAction(),
	//         };
	//         return re;
	//     },
	//     {
	//         wait: 120,
	//     },
	// );
	// const { taxProfiles, salesProfiles } = resp?.data || {};

	const [customerType] = form.watch(["customerType"]);
	const [resolutionRequired, setResolutionRequired] = useState(false);
	const addressId = form.watch("addressId");
	const ordersQuery = useQuery(
		trpc.sales.getOrders.queryOptions(
			{
				"address.id": addressId,
				size: 200,
			},
			{
				enabled: !!addressId,
				staleTime: 60_000,
			},
		),
	);
	const quotesQuery = useQuery(
		trpc.sales.quotes.queryOptions(
			{
				"address.id": addressId,
				salesType: "quote",
				size: 200,
			},
			{
				enabled: !!addressId,
				staleTime: 60_000,
			},
		),
	);
	const sales = useMemo(() => {
		const rows = [
			...(ordersQuery.data?.data ?? []),
			...(quotesQuery.data?.data ?? []),
		];

		return rows.map((sale) => ({
			id: sale.orderId ?? sale.id,
			status: sale.isQuote
				? "Quote"
				: sale.deliveryStatus || sale.status?.delivery?.status || "Order",
			date: sale.createdAt,
			salesRep: sale.salesRep || "-",
		}));
	}, [ordersQuery.data?.data, quotesQuery.data?.data]);

	useEffect(() => {
		setResolutionRequired(sales.length > 0);
	}, [sales.length]);

	function handleCreateCopy() {}
	const [searchInput, setSearchInput] = useState("");
	const isBusiness = customerType === "Business";
	return (
		<Form {...form}>
			<div className="flex flex-col overflow-x-hidden pb-32">
				<div className="mb-4 flex justify-end">
					<QuickFill
						name="customerForm"
						args={{
							addressOnly: !!params.address,
							defaultProfileId: salesProfiles?.[0]
								? String(salesProfiles[0].id)
								: undefined,
							defaultTaxCode: taxProfiles?.[0]?.taxCode,
						}}
					/>
				</div>
				<div className="">
					<Accordion
						key={sections?.join("-")}
						type="multiple"
						defaultValue={sections}
						className="space-y-6"
					>
						{params.address ? (
							<></>
						) : (
							<AccordionItem value="general">
								<AccordionTrigger disabled={!!params.address}>
									General
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-4">
										<ExistingCustomerResolver />
										<FormSelect
											placeholder="Customer Type"
											control={form.control}
											name="customerType"
											label="Customer Type"
											size="sm"
											options={["Personal", "Business"]}
										/>

										<FormInput
											control={form.control}
											name="businessName"
											label="Business Name *"
											size="sm"
											className={cn(!isBusiness && "hidden")}
										/>

										<FormInput
											control={form.control}
											name="name"
											label="Name *"
											size="sm"
											className={cn(isBusiness && "hidden")}
										/>

										<div className="grid grid-cols-2 gap-4">
											<FormInput
												control={form.control}
												name="phoneNo"
												label="Phone"
												size="sm"
												type="phone"
											/>
											<Controller
												control={form.control}
												name="email"
												render={({ field: { value, onChange } }) => (
													<Field className="gap-0">
														<Field.Label>Email</Field.Label>
														<Field.Input
															className="h-8"
															type="email"
															value={value}
															onChange={(e) => {
																onChange(e.target.value?.toLowerCase());
															}}
														/>
													</Field>
												)}
											/>
											{/* <FormInput
                                                control={form.control}
                                                name="email"
                                                label="Email"
                                                size="sm"
                                            /> */}
										</div>
										<div className="grid grid-cols-2 gap-4">
											<FormSelect
												control={form.control}
												name="profileId"
												label="Customer Profile *"
												size="sm"
												titleKey="title"
												valueKey="id"
												options={salesProfiles?.map((s) => ({
													...s,
													id: String(s.id),
												}))}
											/>
											<FormSelect
												control={form.control}
												name="taxCode"
												label="Tax Profile"
												size="sm"
												titleKey="title"
												valueKey="taxCode"
												options={taxProfiles || []}
											/>
											<FormSelect
												size="sm"
												label="Net Term"
												name="netTerm"
												control={form.control}
												options={salesData.paymentTerms}
												valueKey={"value"}
												titleKey={"text"}
											/>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>
						)}

						<AccordionItem value="address">
							<AccordionTrigger>Address</AccordionTrigger>
							<AccordionContent>
								<div className="space-y-4">
									<AddressAutoComplete
										searchInput={searchInput}
										setSearchInput={setSearchInput}
										dialogTitle="Search Address"
										setAddress={(address) => {
											form.setValue(
												"formattedAddress",
												address.formattedAddress,
											);
											form.setValue("address1", address.address1);
											form.setValue("address2", address.address2);
											form.setValue("city", address.city);
											form.setValue("state", address.region);
											form.setValue("zip_code", address.postalCode);
											form.setValue("country", address.country);
											form.setValue("lat", address.lat);
											form.setValue("lng", address.lng);
											// form.setValue("country", address.);
											// form.setValue(
											//     "addressId",
											//     address.id,
											// );
										}}
									/>
									{!params.address || (
										<>
											<FormInput
												control={form.control}
												name="name"
												label="Name"
												size="sm"
											/>

											<div className="grid grid-cols-2 gap-4">
												<FormInput
													control={form.control}
													name="phoneNo"
													label="Phone"
													size="sm"
												/>
												<FormInput
													control={form.control}
													name="email"
													label="Email"
													size="sm"
												/>
											</div>
										</>
									)}
									<FormInput
										control={form.control}
										name="address1"
										label="Address Line 1"
										size="sm"
									/>
									<FormInput
										control={form.control}
										name="route"
										label="Route"
										size="sm"
									/>
									<FormInput
										control={form.control}
										name="address2"
										label="Address Line 2"
										size="sm"
									/>
									<div className="grid grid-cols-2 gap-4">
										<FormInput
											control={form.control}
											name="phoneNo2"
											label="Secondary Phone"
											size="sm"
										/>
										<FormInput
											control={form.control}
											name="city"
											label="City"
											size="sm"
										/>
										<FormInput
											control={form.control}
											name="state"
											label="State / Province"
											size="sm"
										/>
										<FormInput
											control={form.control}
											name="zip_code"
											label="Zip Code / Postal Code"
											size="sm"
										/>
									</div>
								</div>
								{!(sales?.length && resolutionRequired) || (
									<Alert className="mt-4 border-amber-500">
										<AlertTitle className="font-medium text-amber-800">
											Connected Sales Detected
										</AlertTitle>
										<AlertDescription className="mt-2">
											<p className="mb-3 text-sm text-amber-700">
												The address you are editing is connected to multiple (
												{sales?.length}) sales, and this will have all connected
												sales address updated.
											</p>
											<div className="relative">
												<div className="flex flex-wrap gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															setResolutionRequired(false);
														}}
													>
														<Icons.Check className="mr-2 h-4 w-4" />I know
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={handleCreateCopy}
													>
														<Icons.Copy className="mr-2 h-4 w-4" />
														Create a copy
													</Button>
												</div>
												<Accordion
													type="single"
													collapsible
													className="mt-4s hidden"
												>
													<AccordionItem value="connected-sales">
														<AccordionTrigger className="text-sm font-medium">
															Connected Sales ({sales.length})
														</AccordionTrigger>
														<AccordionContent>
															<div className="space-y-3">
																{sales.map((sale) => (
																	<div
																		key={sale.id}
																		className="rounded-md border p-3 text-sm"
																	>
																		<div className="mb-2 flex items-start justify-between">
																			<div className="font-medium">
																				{sale.id}
																			</div>
																			<Badge
																				variant={
																					sale.status === "Completed"
																						? "default"
																						: sale.status === "Pending"
																							? "outline"
																							: "destructive"
																				}
																			>
																				{sale.status}
																			</Badge>
																		</div>
																		<div className="text-muted-foreground">
																			<div>
																				Date:{" "}
																				{new Date(
																					sale.date,
																				).toLocaleDateString()}
																			</div>
																			<div>Sales Rep: {sale.salesRep}</div>
																		</div>
																	</div>
																))}
															</div>
														</AccordionContent>
													</AccordionItem>
												</Accordion>
											</div>
										</AlertDescription>
									</Alert>
								)}
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</div>
		</Form>
	);
}
