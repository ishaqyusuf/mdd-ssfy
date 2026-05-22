"use client";

import { CustomerQuickFill } from "@/components/dev/quick-fill";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
	type DealerPortalCustomerSchema,
	dealerPortalCustomerSchema,
} from "@api/schemas/dealer";
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
import { InputGroup } from "@gnd/ui/namespace";
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
import {
	US_PHONE_FORMAT_PATTERN,
	formatUSPhoneNumber,
} from "@gnd/utils/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	BriefcaseBusiness,
	Mail,
	MapPin,
	Phone,
	Sparkles,
	UserRound,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { PatternFormat } from "react-number-format";

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
		phoneNo: formatUSPhoneNumber(customer?.phoneNo) || "",
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

function FieldIcon({ children }: { children: ReactNode }) {
	return (
		<div className="pointer-events-none absolute left-3 top-9 flex size-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
			{children}
		</div>
	);
}

function FormSection({
	children,
	description,
	icon,
	title,
}: {
	children: ReactNode;
	description: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
			<div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm">
					{icon}
				</div>
				<div className="min-w-0">
					<h3 className="text-sm font-semibold text-slate-950">{title}</h3>
					<p className="mt-0.5 text-xs leading-5 text-slate-500">
						{description}
					</p>
				</div>
			</div>
			<div className="p-4">{children}</div>
		</div>
	);
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

	const cancelAction = onCancel ? (
		<Button onClick={onCancel} type="button" variant="outline">
			Cancel
		</Button>
	) : (
		<Button asChild type="button" variant="outline">
			<Link href="/customers">Cancel</Link>
		</Button>
	);

	const actions = (
		<>
			{cancelAction}
			<CustomerQuickFill defaultProfileId={profiles[0]?.id ?? null} />
			<Button
				className="shadow-sm"
				disabled={saveCustomer.isPending}
				form={formId}
				type="submit"
			>
				{saveCustomer.isPending ? "Saving..." : "Save customer"}
			</Button>
		</>
	);

	return (
		<Form {...form}>
			<section
				className={cn(
					"overflow-hidden",
					mode === "page"
						? "rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_34%),linear-gradient(180deg,_#ffffff,_#f8fafc)] p-4 shadow-sm"
						: "-mx-4 -mt-2 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_36%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 pb-4",
				)}
			>
				<div className="mb-4 rounded-lg border border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/70 p-4 shadow-sm">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0 space-y-2">
							<div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
								<Sparkles className="size-3" />
								Customer profile
							</div>
							<div>
								<h2 className="text-xl font-semibold tracking-tight text-slate-950">
									{customer?.id
										? "Update customer details"
										: "Create a customer"}
								</h2>
								<p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
									Keep billing, sales profile, and delivery contact information
									together before a quote or order moves forward.
								</p>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
							<div className="flex size-8 items-center justify-center rounded-md bg-sky-50 text-sky-700">
								<UsersRound className="size-4" />
							</div>
							<div>
								<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
									Mode
								</p>
								<p className="text-sm font-semibold text-slate-900">
									{customer?.id ? "Editing" : "New record"}
								</p>
							</div>
						</div>
					</div>
				</div>
				<form
					id={formId}
					key={customer?.id || "new-customer"}
					onSubmit={form.handleSubmit((values) => saveCustomer.mutate(values))}
				>
					<FieldGroup className="grid gap-4">
						<FormSection
							description="Name and customer grouping"
							icon={<UserRound className="size-4" />}
							title="Identity"
						>
							<div className="grid gap-3 md:grid-cols-2">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="relative">
											<FormLabel>Name</FormLabel>
											<FieldIcon>
												<UserRound className="size-4" />
											</FieldIcon>
											<FormControl>
												<InputGroup className="h-11 bg-slate-50/60 pl-10 focus-within:bg-white">
													<InputGroup.Addon>
														<InputGroup.Text>+1</InputGroup.Text>
													</InputGroup.Addon>
													<PatternFormat
														customInput={InputGroup.Input}
														format="###-###-####"
														mask="_"
														name={field.name}
														getInputRef={field.ref}
														inputMode="numeric"
														autoComplete="tel-national"
														placeholder="XXX-XXX-XXXX"
														type="tel"
														value={field.value ?? ""}
														onBlur={field.onBlur}
														onValueChange={({ formattedValue, value }) => {
															if (!value) {
																field.onChange("");
																return;
															}

															if (
																US_PHONE_FORMAT_PATTERN.test(formattedValue)
															) {
																field.onChange(formattedValue);
																return;
															}

															field.onChange(
																formattedValue.replaceAll("_", ""),
															);
														}}
													/>
												</InputGroup>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="businessName"
									render={({ field }) => (
										<FormItem className="relative">
											<FormLabel>Business name</FormLabel>
											<FieldIcon>
												<BriefcaseBusiness className="size-4" />
											</FieldIcon>
											<FormControl>
												<Input
													{...field}
													className="h-11 bg-slate-50/60 pl-12 focus-visible:bg-white"
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="customerTypeId"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel>Sales profile</FormLabel>
											<Select
												onValueChange={(value) =>
													field.onChange(
														value === "none" ? null : Number(value),
													)
												}
												value={field.value ? String(field.value) : "none"}
											>
												<FormControl>
													<SelectTrigger className="h-11 bg-slate-50/60 focus:bg-white">
														<SelectValue placeholder="None" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectGroup>
														<SelectItem value="none">None</SelectItem>
														{profiles.map((profile) => (
															<SelectItem
																key={profile.id}
																value={String(profile.id)}
															>
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
							</div>
						</FormSection>

						<FormSection
							description="Contact and delivery details"
							icon={<Phone className="size-4" />}
							title="Reachability"
						>
							<div className="grid gap-3 md:grid-cols-2">
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem className="relative">
											<FormLabel>Email</FormLabel>
											<FieldIcon>
												<Mail className="size-4" />
											</FieldIcon>
											<FormControl>
												<Input
													{...field}
													className="h-11 bg-slate-50/60 pl-12 focus-visible:bg-white"
													onChange={(event) =>
														field.onChange(
															event.currentTarget.value.toLowerCase(),
														)
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
										<FormItem className="relative">
											<FormLabel>Phone</FormLabel>
											<FieldIcon>
												<Phone className="size-4" />
											</FieldIcon>
											<FormControl>
												<Input
													{...field}
													className="h-11 bg-slate-50/60 pl-12 focus-visible:bg-white"
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="address"
									render={({ field }) => (
										<FormItem className="relative md:col-span-2">
											<FormLabel>Address</FormLabel>
											<FieldIcon>
												<MapPin className="size-4" />
											</FieldIcon>
											<FormControl>
												<Textarea
													{...field}
													className="min-h-24 bg-slate-50/60 pl-12 pt-3 focus-visible:bg-white"
													rows={4}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</FormSection>

						{renderActions ? null : (
							<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
								{actions}
							</div>
						)}
					</FieldGroup>
				</form>
				{renderActions ? renderActions(actions) : null}
			</section>
		</Form>
	);
}
