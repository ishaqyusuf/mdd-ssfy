"use client";

import { useSalesProfileFormParams } from "@/hooks/use-sales-profile-form-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { FieldGroup } from "@gnd/ui/field";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	dealerPortalSalesProfileSchema,
	type DealerPortalSalesProfileSchema,
} from "@api/schemas/dealer";
import { Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { CustomModal } from "./custom-modal";

const SALES_PROFILE_FORM_ID = "dealer-sales-profile-form";

type SalesProfileRecord = {
	id?: number | null;
	title?: string | null;
	salesPercentage?: number | null;
	defaultProfile?: boolean | null;
} | null;

function formatExampleCurrency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(value);
}

function formatExamplePercentage(value: number) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(Math.abs(value));
}

function getSalesProfileDefaultValues(
	profile?: SalesProfileRecord,
): DealerPortalSalesProfileSchema {
	return {
		id: profile?.id || null,
		title: profile?.title || "",
		salesPercentage: profile?.salesPercentage ?? null,
		defaultProfile: !!profile?.defaultProfile,
	};
}

export function SalesProfileFormModal() {
	const profileForm = useSalesProfileFormParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const selectedProfile = useMemo(
		() =>
			profilesQuery.data?.find(
				(profile) => profile.id === profileForm.params.salesProfileId,
			) ?? null,
		[profilesQuery.data, profileForm.params.salesProfileId],
	);
	const form = useZodForm(dealerPortalSalesProfileSchema, {
		defaultValues: getSalesProfileDefaultValues(selectedProfile),
	});
	const saveProfile = useMutation(
		trpc.dealerPortal.saveSalesProfile.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.salesProfiles.pathKey(),
				});
				toast({
					title: "Sales profile saved.",
					variant: "success",
				});
				profileForm.close();
			},
			onError: (error) => {
				toast({
					title: "Could not save profile.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const isEditing = Boolean(profileForm.params.salesProfileId);
	const isMissingProfile =
		isEditing && !profilesQuery.isPending && !selectedProfile;
	const salesPercentageValue = Number(form.watch("salesPercentage") || 0);
	const examplePercentage = Number.isFinite(salesPercentageValue)
		? salesPercentageValue
		: 0;
	const exampleBasePrice = 80;
	const exampleAdjustedPrice =
		exampleBasePrice * (1 + examplePercentage / 100);
	const exampleOperator = examplePercentage < 0 ? "-" : "+";
	const salesPercentageDescription = `Enter the percentage adjustment for this profile. 25 means prices increase by 25%; -10 means prices decrease by 10%. Example: ${formatExampleCurrency(exampleBasePrice)} ${exampleOperator} ${formatExamplePercentage(examplePercentage)}% = ${formatExampleCurrency(exampleAdjustedPrice)}.`;

	useEffect(() => {
		if (!profileForm.opened) return;
		form.reset(getSalesProfileDefaultValues(selectedProfile));
	}, [form, profileForm.opened, selectedProfile]);

	if (!profileForm.opened) return null;

	return (
		<Form {...form}>
			<CustomModal
				description="Set dealer pricing behavior and defaults for customer groups."
				onOpenChange={(open) => {
					if (!open) profileForm.close();
				}}
				open={profileForm.opened}
				rounded
				size="2xl"
				title={profileForm.title}
			>
				<CustomModal.Content className="pb-20">
					{isEditing && profilesQuery.isPending ? (
						<div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
							Loading sales profile...
						</div>
					) : isMissingProfile ? (
						<div className="flex flex-col gap-4 rounded-lg border border-dashed p-6">
							<p className="text-sm text-muted-foreground">
								We could not load this sales profile.
							</p>
							<Button onClick={profileForm.close} type="button" variant="outline">
								Close
							</Button>
						</div>
					) : (
						<form
							id={SALES_PROFILE_FORM_ID}
							key={selectedProfile?.id || "new-profile"}
							onSubmit={form.handleSubmit((values) =>
								saveProfile.mutate(values),
							)}
						>
							<FieldGroup>
								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Profile name</FormLabel>
											<FormControl>
												<Input {...field} required value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="salesPercentage"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Price adjustment %</FormLabel>
											<FormControl>
												<Input
													name={field.name}
													onBlur={field.onBlur}
													onChange={(event) => {
														const input = event.currentTarget.value;
														field.onChange(input === "" ? null : Number(input));
													}}
													ref={field.ref}
													step="0.01"
													type="number"
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormDescription>{salesPercentageDescription}</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="defaultProfile"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center gap-2">
											<FormControl>
												<Checkbox
													checked={!!field.value}
													onCheckedChange={(checked) =>
														field.onChange(checked === true)
													}
												/>
											</FormControl>
											<FormLabel className="font-normal">Default profile</FormLabel>
											<FormMessage />
										</FormItem>
									)}
								/>
							</FieldGroup>
						</form>
					)}
				</CustomModal.Content>
				{!isMissingProfile && !(isEditing && profilesQuery.isPending) ? (
					<CustomModal.Footer className="absolute bottom-0 left-0 right-0 gap-2 border-t bg-background p-4">
						<Button
							disabled={saveProfile.isPending}
							form={SALES_PROFILE_FORM_ID}
							type="submit"
						>
							<Save data-icon="inline-start" />
							{saveProfile.isPending ? "Saving..." : "Save profile"}
						</Button>
						<Button onClick={profileForm.close} type="button" variant="outline">
							Cancel
						</Button>
					</CustomModal.Footer>
				) : null}
			</CustomModal>
		</Form>
	);
}
