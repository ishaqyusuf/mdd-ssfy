"use client";

import { Field } from "@/components/dealer-portal/shared";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";

type CustomerFormRecord = {
	id: number;
	name: string | null;
	businessName: string | null;
	email: string | null;
	phoneNo: string | null;
	address: string | null;
	customerTypeId: number | null;
} | null;

export function CustomerFormClient({
	customer,
}: {
	customer?: CustomerFormRecord;
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const queryClient = useQueryClient();
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
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

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const customerTypeId = Number(form.get("customerTypeId") || 0);

		saveCustomer.mutate({
			id: customer?.id || null,
			name: String(form.get("name") || ""),
			businessName: String(form.get("businessName") || ""),
			email: String(form.get("email") || ""),
			phoneNo: String(form.get("phoneNo") || ""),
			address: String(form.get("address") || ""),
			customerTypeId: customerTypeId || null,
		});
	}

	return (
		<section className="rounded-lg border bg-background p-4">
			<form
				className="grid gap-3 md:grid-cols-2"
				key={customer?.id || "new-customer"}
				onSubmit={onSubmit}
			>
				<Field defaultValue={customer?.name || ""} label="Name" name="name" />
				<Field
					defaultValue={customer?.businessName || ""}
					label="Business name"
					name="businessName"
				/>
				<Field
					defaultValue={customer?.email || ""}
					label="Email"
					name="email"
					type="email"
				/>
				<Field defaultValue={customer?.phoneNo || ""} label="Phone" name="phoneNo" />
				<label className="space-y-2">
					<span className="text-sm font-medium">Sales profile</span>
					<select
						className="h-9 w-full rounded-md border bg-background px-3 text-sm"
						defaultValue={customer?.customerTypeId || ""}
						name="customerTypeId"
					>
						<option value="">None</option>
						{(profilesQuery.data ?? []).map((profile) => (
							<option key={profile.id} value={profile.id}>
								{profile.title}
							</option>
						))}
					</select>
				</label>
				<div className="space-y-2 md:col-span-2">
					<label className="text-sm font-medium" htmlFor="customer-address">
						Address
					</label>
					<Textarea
						defaultValue={customer?.address || ""}
						id="customer-address"
						name="address"
						rows={3}
					/>
				</div>
				<div className="flex gap-2 md:col-span-2">
					<Button disabled={saveCustomer.isPending} type="submit">
						{saveCustomer.isPending ? "Saving..." : "Save customer"}
					</Button>
					<Button asChild type="button" variant="outline">
						<Link href="/customers">Cancel</Link>
					</Button>
				</div>
			</form>
		</section>
	);
}
