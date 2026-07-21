"use client";

import { Footer } from "@/components/footer";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

type ProfileForm = {
	name: string;
	businessName: string;
	phoneNo: string;
};

type AddressForm = {
	id?: number;
	name: string;
	email: string;
	phone: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	isPrimary: boolean;
};

const emptyAddress: AddressForm = {
	name: "",
	email: "",
	phone: "",
	address1: "",
	address2: "",
	city: "",
	state: "",
	postalCode: "",
	country: "US",
	isPrimary: false,
};

export function AccountPageClient() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const account = useQuery(trpc.storefrontCommerce.account.get.queryOptions());
	const orders = useQuery(
		trpc.storefrontCommerce.orders.list.queryOptions({
			status: "all",
			limit: 3,
		}),
	);
	const [profile, setProfile] = useState<ProfileForm>({
		name: "",
		businessName: "",
		phoneNo: "",
	});
	const [editingAddress, setEditingAddress] =
		useState<AddressForm>(emptyAddress);

	useEffect(() => {
		if (!account.data) return;
		setProfile({
			name: account.data.name || "",
			businessName: account.data.businessName || "",
			phoneNo: account.data.phoneNo || "",
		});
	}, [account.data]);

	const invalidateAccount = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.storefrontCommerce.account.get.queryKey(),
		});

	const updateProfile = useMutation(
		trpc.storefrontCommerce.account.updateProfile.mutationOptions({
			onSuccess: () => void invalidateAccount(),
		}),
	);
	const saveAddress = useMutation(
		trpc.storefrontCommerce.account.saveAddress.mutationOptions({
			onSuccess: () => {
				setEditingAddress(emptyAddress);
				void invalidateAccount();
			},
		}),
	);
	const deleteAddress = useMutation(
		trpc.storefrontCommerce.account.deleteAddress.mutationOptions({
			onSuccess: () => void invalidateAccount(),
		}),
	);

	const submitProfile = (event: FormEvent) => {
		event.preventDefault();
		updateProfile.mutate({
			name: profile.name.trim() || null,
			businessName: profile.businessName.trim() || null,
			phoneNo: profile.phoneNo.trim() || null,
		});
	};

	const submitAddress = (event: FormEvent) => {
		event.preventDefault();
		saveAddress.mutate({
			...editingAddress,
			address2: editingAddress.address2 || null,
		});
	};

	if (account.isPending) {
		return (
			<main className="container mx-auto min-h-[60vh] animate-pulse px-4 py-10">
				Loading account…
			</main>
		);
	}
	if (account.error || !account.data) {
		return (
			<main className="container mx-auto min-h-[60vh] px-4 py-16 text-center">
				<h1 className="text-2xl font-semibold">Sign in to your account</h1>
				<p className="mt-2 text-muted-foreground">
					{account.error?.message || "A customer account is required."}
				</p>
				<Button asChild className="mt-5">
					<Link href="/login?callbackUrl=/account">Sign in</Link>
				</Button>
			</main>
		);
	}

	const data = account.data;
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-10">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight">
							My account
						</h1>
						<p className="mt-1 text-muted-foreground">
							Manage your contact information, saved addresses, and orders.
						</p>
					</div>
					<Button
						variant="outline"
						onClick={() => void signOut({ callbackUrl: "/" })}
					>
						Sign out
					</Button>
				</div>

				<div className="mt-8 grid gap-6 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Profile information</CardTitle>
						</CardHeader>
						<CardContent>
							{updateProfile.error && (
								<Alert variant="destructive" className="mb-4">
									<AlertDescription>
										{updateProfile.error.message}
									</AlertDescription>
								</Alert>
							)}
							{updateProfile.isSuccess && (
								<Alert className="mb-4">
									<AlertDescription>Profile updated.</AlertDescription>
								</Alert>
							)}
							<form className="space-y-4" onSubmit={submitProfile}>
								<Field
									label="Name"
									value={profile.name}
									onChange={(value) =>
										setProfile((current) => ({ ...current, name: value }))
									}
								/>
								<Field
									label="Business name"
									value={profile.businessName}
									onChange={(value) =>
										setProfile((current) => ({
											...current,
											businessName: value,
										}))
									}
								/>
								<div>
									<Label>Email</Label>
									<Input value={data.email || ""} readOnly className="mt-1" />
									<p className="mt-1 text-xs text-muted-foreground">
										{data.emailVerified
											? "Verified email"
											: "Email verification is pending"}
									</p>
								</div>
								<Field
									label="Phone"
									value={profile.phoneNo}
									onChange={(value) =>
										setProfile((current) => ({ ...current, phoneNo: value }))
									}
								/>
								<Button type="submit" disabled={updateProfile.isPending}>
									{updateProfile.isPending ? "Saving…" : "Save profile"}
								</Button>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle>Recent orders</CardTitle>
							<Button asChild size="sm" variant="outline">
								<Link href="/orders">View all</Link>
							</Button>
						</CardHeader>
						<CardContent>
							{!orders.data?.items.length ? (
								<p className="py-8 text-center text-muted-foreground">
									No orders yet.
								</p>
							) : (
								<div className="space-y-3">
									{orders.data.items.map((order) => (
										<Link
											key={order.id}
											href={`/orders/${encodeURIComponent(order.orderId)}`}
											className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40"
										>
											<div>
												<p className="font-medium">{order.orderId}</p>
												<p className="text-sm text-muted-foreground">
													{order.statusLabel} · {order.itemCount} items
												</p>
											</div>
											<span>${order.grandTotal.toFixed(2)}</span>
										</Link>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<Card className="mt-6">
					<CardHeader>
						<CardTitle>Saved addresses</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{data.addresses.map((address) => (
								<article key={address.id} className="rounded-md border p-4">
									<p className="font-medium">
										{address.name}{" "}
										{address.isPrimary && (
											<span className="text-xs text-muted-foreground">
												(Primary)
											</span>
										)}
									</p>
									<p className="mt-2 text-sm text-muted-foreground">
										{address.address1}
										{address.address2 ? `, ${address.address2}` : ""}
										<br />
										{[address.city, address.state, address.postalCode]
											.filter(Boolean)
											.join(", ")}
										<br />
										{address.country}
									</p>
									<div className="mt-4 flex gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												setEditingAddress({
													id: address.id,
													name: address.name || "",
													email: address.email || "",
													phone: address.phone || "",
													address1: address.address1 || "",
													address2: address.address2 || "",
													city: address.city || "",
													state: address.state || "",
													postalCode: address.postalCode || "",
													country: address.country || "US",
													isPrimary: address.isPrimary,
												})
											}
										>
											Edit
										</Button>
										<Button
											size="sm"
											variant="ghost"
											disabled={deleteAddress.isPending}
											onClick={() => deleteAddress.mutate({ id: address.id })}
										>
											Delete
										</Button>
									</div>
								</article>
							))}
						</div>

						<form
							className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2 lg:grid-cols-3"
							onSubmit={submitAddress}
						>
							<h2 className="sm:col-span-2 lg:col-span-3 text-lg font-medium">
								{editingAddress.id ? "Edit address" : "Add address"}
							</h2>
							{saveAddress.error && (
								<Alert
									variant="destructive"
									className="sm:col-span-2 lg:col-span-3"
								>
									<AlertDescription>
										{saveAddress.error.message}
									</AlertDescription>
								</Alert>
							)}
							{(
								[
									["name", "Name"],
									["email", "Email"],
									["phone", "Phone"],
									["address1", "Address"],
									["address2", "Address line 2"],
									["city", "City"],
									["state", "State"],
									["postalCode", "Postal code"],
									["country", "Country"],
								] as const
							).map(([key, label]) => (
								<Field
									key={key}
									label={label}
									type={key === "email" ? "email" : "text"}
									required={key !== "address2"}
									value={editingAddress[key] as string}
									onChange={(value) =>
										setEditingAddress((current) => ({
											...current,
											[key]: value,
										}))
									}
								/>
							))}
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={editingAddress.isPrimary}
									onChange={(event) =>
										setEditingAddress((current) => ({
											...current,
											isPrimary: event.target.checked,
										}))
									}
								/>
								Make primary
							</label>
							<div className="flex gap-2 sm:col-span-2 lg:col-span-3">
								<Button type="submit" disabled={saveAddress.isPending}>
									{saveAddress.isPending ? "Saving…" : "Save address"}
								</Button>
								{editingAddress.id && (
									<Button
										type="button"
										variant="outline"
										onClick={() => setEditingAddress(emptyAddress)}
									>
										Cancel
									</Button>
								)}
							</div>
						</form>
					</CardContent>
				</Card>
			</main>
			<Footer />
		</div>
	);
}

function Field({
	label,
	value,
	onChange,
	required,
	type = "text",
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	type?: string;
}) {
	return (
		<div>
			<Label>{label}</Label>
			<Input
				className="mt-1"
				type={type}
				value={value}
				required={required}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}
