"use client";

import { useTRPC } from "@/trpc/client";
import { salesFormDeliveryOptions } from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Upload } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Field } from "./shared";

function getSettingLogoUrl(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
	const value = (meta as { logoUrl?: unknown }).logoUrl;
	return typeof value === "string" ? value : "";
}

function getSettingDefaults(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
		return {
			defaultTaxCode: "",
			defaultCustomerProfileId: "",
			defaultFulfillmentMode: "pickup",
		};
	}
	const defaults = meta as {
		defaultTaxCode?: unknown;
		defaultCustomerProfileId?: unknown;
		defaultFulfillmentMode?: unknown;
	};
	return {
		defaultTaxCode:
			typeof defaults.defaultTaxCode === "string"
				? defaults.defaultTaxCode
				: "",
		defaultCustomerProfileId:
			typeof defaults.defaultCustomerProfileId === "number"
				? String(defaults.defaultCustomerProfileId)
				: "",
		defaultFulfillmentMode:
			typeof defaults.defaultFulfillmentMode === "string"
				? defaults.defaultFulfillmentMode
				: "pickup",
	};
}

function getBillingZip(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
	const value = (meta as { billingZip?: unknown }).billingZip;
	return typeof value === "string" ? value : "";
}

export function DealerSettings() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [logoUrl, setLogoUrl] = useState("");
	const settingsQuery = useQuery(trpc.dealerPortal.settings.queryOptions());
	const profilesQuery = useQuery(trpc.dealerPortal.salesProfiles.queryOptions());
	const taxProfilesQuery = useQuery(trpc.dealerPortal.taxProfiles.queryOptions());
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
		const defaultCustomerProfileId = Number(
			form.get("defaultCustomerProfileId") || 0,
		);

		saveSettings.mutate({
			name: String(form.get("name") || ""),
			companyName: String(form.get("companyName") || ""),
			phoneNo: String(form.get("phoneNo") || ""),
			logoUrl: logoUrl || "",
			address1: String(form.get("address1") || ""),
			address2: String(form.get("address2") || ""),
			city: String(form.get("city") || ""),
			state: String(form.get("state") || ""),
			zip_code: String(form.get("zip_code") || ""),
			country: String(form.get("country") || ""),
			defaultTaxCode: String(form.get("defaultTaxCode") || "") || null,
			defaultCustomerProfileId: defaultCustomerProfileId || null,
			defaultFulfillmentMode: String(form.get("defaultFulfillmentMode") || "") as
				| "pickup"
				| "delivery"
				| "ship",
		});
	}

	function onLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast({
				title: "Choose an image file.",
				variant: "destructive",
			});
			return;
		}
		if (file.size > 350_000) {
			toast({
				title: "Logo image is too large.",
				description: "Upload an image under 350 KB.",
				variant: "destructive",
			});
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				setLogoUrl(reader.result);
			}
		};
		reader.onerror = () => {
			toast({
				title: "Could not read logo image.",
				variant: "destructive",
			});
		};
		reader.readAsDataURL(file);
	}

	const settings = settingsQuery.data;
	const defaults = getSettingDefaults(settings?.meta);
	const dealershipProfileName = settings?.dealer?.profile?.title || null;
	const profiles = profilesQuery.data ?? [];
	const taxProfiles = taxProfilesQuery.data ?? [];

	useEffect(() => {
		setLogoUrl(getSettingLogoUrl(settings?.meta));
	}, [settings?.meta]);

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
					<div className="space-y-2">
						<Label htmlFor="logoUrlDisplay">Logo URL</Label>
						<Input
							id="logoUrlDisplay"
							onChange={(event) => setLogoUrl(event.target.value)}
							placeholder="https://..."
							value={logoUrl.startsWith("data:") ? "" : logoUrl}
						/>
					</div>
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

				<div className="rounded-md border border-dashed p-3">
					<label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
						<Upload className="size-4" />
						Upload invoice logo
						<input
							accept="image/*"
							className="sr-only"
							onChange={onLogoFileChange}
							type="file"
						/>
					</label>
					<p className="mt-1 text-xs text-muted-foreground">
						PNG, JPG, WebP, GIF, or SVG under 350 KB.
					</p>
				</div>

				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-sm font-medium">GND dealership profile</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{dealershipProfileName || "No dealership profile assigned"}
					</p>
				</div>

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
						defaultValue={getBillingZip(settings?.meta)}
						label="ZIP / Postal code"
						name="zip_code"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.country || ""}
						label="Country"
						name="country"
					/>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<label className="space-y-2">
						<span className="text-sm font-medium">Default tax group</span>
						<select
							className="h-9 w-full rounded-md border bg-background px-3 text-sm"
							defaultValue={defaults.defaultTaxCode}
							name="defaultTaxCode"
						>
							<option value="">Tax Exempt</option>
							{taxProfiles.map((tax) => (
								<option key={tax.taxCode} value={tax.taxCode}>
									{tax.title}
									{Number(tax.percentage || 0) > 0
										? ` (${tax.percentage}%)`
										: ""}
								</option>
							))}
						</select>
					</label>
					<label className="space-y-2">
						<span className="text-sm font-medium">Default profile</span>
						<select
							className="h-9 w-full rounded-md border bg-background px-3 text-sm"
							defaultValue={defaults.defaultCustomerProfileId}
							name="defaultCustomerProfileId"
						>
							<option value="">No default</option>
							{profiles.map((profile) => (
								<option key={profile.id} value={profile.id}>
									{profile.title}
								</option>
							))}
						</select>
					</label>
					<label className="space-y-2">
						<span className="text-sm font-medium">Fulfillment mode</span>
						<select
							className="h-9 w-full rounded-md border bg-background px-3 text-sm"
							defaultValue={defaults.defaultFulfillmentMode}
							name="defaultFulfillmentMode"
						>
							{salesFormDeliveryOptions.map((mode) => (
								<option key={mode} value={mode}>
									{mode}
								</option>
							))}
						</select>
					</label>
				</div>

				<Button
					disabled={
						saveSettings.isPending ||
						settingsQuery.isPending ||
						profilesQuery.isPending ||
						taxProfilesQuery.isPending
					}
					type="submit"
				>
					<Building2 className="mr-2 size-4" />
					{saveSettings.isPending ? "Saving..." : "Save company settings"}
				</Button>
			</form>
		</section>
	);
}
