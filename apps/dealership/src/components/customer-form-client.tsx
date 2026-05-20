"use client";

import { CustomerQuickFill } from "@/components/dev/quick-fill";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { FieldGroup } from "@gnd/ui/field";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	dealerPortalCustomerSchema,
	type DealerPortalCustomerSchema,
} from "@api/schemas/dealer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

type CustomerFormRecord = {
	id: number;
	name: string | null;
	businessName: string | null;
	email: string | null;
	phoneNo: string | null;
	address: string | null;
	customerTypeId: number | null;
} | null;

function getCustomerDefaultValues(
	customer?: CustomerFormRecord,
): DealerPortalCustomerSchema {
	return {
		id: customer?.id || null,
		name: customer?.name || "",
		businessName: customer?.businessName || "",
		email: customer?.email || "",
		phoneNo: customer?.phoneNo || "",
		address: customer?.address || "",
		customerTypeId: customer?.customerTypeId || null,
	};
}

function formatSalesProfileOption(profile: {
	title?: string | null;
	salesPercentage?: number | null;
}) {
	const percentage = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(Number(profile.salesPercentage || 0));

	return `${profile.title || "Untitled profile"} (${percentage}%)`;
}

export function CustomerFormClient({
	customer,
	formId,
	mode = "page",
	renderActions,
	onCancel,
	onSaved,
}: {
	customer?: CustomerFormRecord;
	formId?: string;
	mode?: "page" | "modal";
	renderActions?: (actions: ReactNode) => ReactNode;
	onCancel?: () => void;
	onSaved?: () => void;
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const queryClient = useQueryClient();
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const form = useZodForm(dealerPortalCustomerSchema, {
		defaultValues: getCustomerDefaultValues(customer ?? null),
	});
	const saveCustomer = useMutation(
		trpc.dealerPortal.saveCustomer.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.customers.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.customersList.pathKey(),
					}),
				]);
				toast({
					title: "Customer saved.",
					variant: "success",
				});
				if (onSaved) {
					onSaved();
					router.refresh();
					return;
				}

				router.push("/customers");
				router.refresh();
			},
			onError: (error) => {
				toast({
					title: "Could not save customer.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	useEffect(() => {
		form.reset(getCustomerDefaultValues(customer ?? null));
	}, [customer, form]);

	const profiles = profilesQuery.data ?? [];

	const actions = (
		<>
			<CustomerQuickFill defaultProfileId={profiles[0]?.id ?? null} />
			<Button disabled={saveCustomer.isPending} form={formId} type="submit">
				{saveCustomer.isPending ? "Saving..." : "Save customer"}
			</Button>
			{onCancel ? (
				<Button onClick={onCancel} type="button" variant="outline">
					Cancel
				</Button>
			) : (
				<Button asChild type="button" variant="outline">
					<Link href="/customers">Cancel</Link>
				</Button>
			)}
		</>
	);

	return (
		<Form {...form}>
			<section
				className={cn(
					mode === "page" ? "rounded-lg border bg-background p-4" : "bg-background",
				)}
			>
				<form
					id={formId}
					key={customer?.id || "new-customer"}
					onSubmit={form.handleSubmit((values) => saveCustomer.mutate(values))}
				>
					<FieldGroup className="grid gap-3 md:grid-cols-2">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} value={field.value ?? ""} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="businessName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Business name</FormLabel>
									<FormControl>
										<Input {...field} value={field.value ?? ""} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(event) =>
												field.onChange(event.currentTarget.value.toLowerCase())
											}
											type="email"
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="phoneNo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Phone</FormLabel>
									<FormControl>
										<Input {...field} value={field.value ?? ""} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="customerTypeId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Sales profile</FormLabel>
									<Select
										onValueChange={(value) =>
											field.onChange(value === "none" ? null : Number(value))
										}
										value={field.value ? String(field.value) : "none"}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="None" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="none">None</SelectItem>
												{profiles.map((profile) => (
													<SelectItem key={profile.id} value={String(profile.id)}>
														{formatSalesProfileOption(profile)}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem className="md:col-span-2">
									<FormLabel>Address</FormLabel>
									<FormControl>
										<Textarea {...field} rows={3} value={field.value ?? ""} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{renderActions ? null : (
							<div className="flex gap-2 md:col-span-2">{actions}</div>
						)}
					</FieldGroup>
				</form>
				{renderActions ? renderActions(actions) : null}
			</section>
		</Form>
	);
}
