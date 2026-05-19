"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import type { FormEvent } from "react";
import { Field } from "./shared";

function getSettingLogoUrl(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
	const value = (meta as { logoUrl?: unknown }).logoUrl;
	return typeof value === "string" ? value : "";
}

export function DealerSettings() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(trpc.dealerPortal.settings.queryOptions());
	const saveSettings = useMutation(
		trpc.dealerPortal.saveSettings.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.settings.pathKey(),
				});
				toast({
					title: "Company settings saved.",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Could not save settings.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);

		saveSettings.mutate({
			name: String(form.get("name") || ""),
			companyName: String(form.get("companyName") || ""),
			phoneNo: String(form.get("phoneNo") || ""),
			logoUrl: String(form.get("logoUrl") || ""),
			address1: String(form.get("address1") || ""),
			address2: String(form.get("address2") || ""),
			city: String(form.get("city") || ""),
			state: String(form.get("state") || ""),
			country: String(form.get("country") || ""),
		});
	}

	const settings = settingsQuery.data;
	const logoUrl = getSettingLogoUrl(settings?.meta);

	return (
		<section className="rounded-lg border bg-background p-4">
			<form
				className="space-y-6"
				key={settingsQuery.dataUpdatedAt || "dealer-settings"}
				onSubmit={onSubmit}
			>
				<div className="grid gap-3 md:grid-cols-2">
					<Field
						defaultValue={settings?.name || ""}
						label="Contact name"
						name="name"
					/>
					<Field
						defaultValue={settings?.companyName || ""}
						label="Company name"
						name="companyName"
					/>
					<Field
						defaultValue={settings?.phoneNo || ""}
						label="Phone"
						name="phoneNo"
					/>
					<Field
						defaultValue={logoUrl}
						label="Logo URL"
						name="logoUrl"
						type="url"
					/>
				</div>

				{logoUrl ? (
					<div className="flex items-center gap-3 rounded-md border p-3">
						<div className="flex size-14 items-center justify-center overflow-hidden rounded-md border bg-muted">
							<img
								alt=""
								className="max-h-full max-w-full object-contain"
								src={logoUrl}
							/>
						</div>
						<div>
							<p className="text-sm font-medium">Invoice logo</p>
							<p className="text-xs text-muted-foreground">{settings?.email}</p>
						</div>
					</div>
				) : null}

				<div className="grid gap-3 md:grid-cols-2">
					<Field
						defaultValue={settings?.primaryBillingAddress?.address1 || ""}
						label="Address line 1"
						name="address1"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.address2 || ""}
						label="Address line 2"
						name="address2"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.city || ""}
						label="City"
						name="city"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.state || ""}
						label="State"
						name="state"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.country || ""}
						label="Country"
						name="country"
					/>
				</div>

				<Button
					disabled={saveSettings.isPending || settingsQuery.isPending}
					type="submit"
				>
					<Building2 className="mr-2 size-4" />
					{saveSettings.isPending ? "Saving..." : "Save company settings"}
				</Button>
			</form>
		</section>
	);
}
