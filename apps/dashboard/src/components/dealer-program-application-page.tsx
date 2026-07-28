"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function DealerProgramApplicationPage({ token }: { token: string }) {
	const trpc = useTRPC();
	const [consented, setConsented] = useState(false);
	const invitation = useQuery(
		trpc.dealerProgram.invitation.queryOptions({ token }),
	);
	const submit = useMutation(
		trpc.dealerProgram.submitApplication.mutationOptions({
			onSuccess: () => invitation.refetch(),
		}),
	);

	if (invitation.isPending) {
		return <ApplicationShell>Loading your invitation...</ApplicationShell>;
	}
	if (invitation.isError || !invitation.data) {
		return (
			<ApplicationShell>
				This dealership invitation is invalid, expired, or no longer active.
			</ApplicationShell>
		);
	}

	const { campaign, customer, application } = invitation.data;
	if (application || submit.isSuccess) {
		return (
			<ApplicationShell>
				<div className="space-y-4 text-center">
					<CheckCircle2 className="mx-auto size-10 text-emerald-600" />
					<h1 className="text-2xl font-semibold">Request received</h1>
					<p className="text-muted-foreground">
						Your dealership partnership request is under review. We’ll send the
						decision to {customer.email}.
					</p>
				</div>
			</ApplicationShell>
		);
	}

	const primaryAddress = customer.addressBooks[0];
	const address = [
		primaryAddress?.address1 || customer.address,
		primaryAddress?.address2,
		primaryAddress?.city,
		primaryAddress?.state,
		primaryAddress?.country,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<ApplicationShell>
			<div className="space-y-6">
				<div>
					<div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
						<Building2 className="size-5" />
					</div>
					<h1 className="text-2xl font-semibold">{campaign.headline}</h1>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">
						{campaign.benefitText}
					</p>
				</div>

				<section className="rounded-xl border bg-muted/20 p-4">
					<h2 className="text-sm font-semibold">Your information</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						This information is already on your customer account and cannot be
						changed here.
					</p>
					<dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
						<Detail
							label="Company / customer"
							value={customer.businessName || customer.name || "-"}
						/>
						<Detail label="Email" value={customer.email || "-"} />
						<Detail label="Phone" value={customer.phoneNo || "-"} />
						<Detail label="Address" value={address || "-"} />
					</dl>
				</section>

				<div className="flex items-start gap-3">
					<Checkbox
						checked={consented}
						id="dealer-program-consent"
						onCheckedChange={(value) => setConsented(value === true)}
					/>
					<Label
						className="text-sm font-normal leading-5"
						htmlFor="dealer-program-consent"
					>
						I confirm this company information and consent to GND reviewing this
						request for dealership partnership.
					</Label>
				</div>

				<Button
					className="w-full"
					disabled={!consented || submit.isPending}
					onClick={() => submit.mutate({ token, consent: true })}
				>
					{submit.isPending ? "Submitting..." : "Request partnership"}
				</Button>
				{submit.error ? (
					<p className="text-sm text-destructive">{submit.error.message}</p>
				) : null}
			</div>
		</ApplicationShell>
	);
}

function ApplicationShell({ children }: { children: React.ReactNode }) {
	return (
		<main className="min-h-screen bg-muted/30 px-4 py-12">
			<div className="mx-auto max-w-xl rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
				{children}
			</div>
		</main>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-1 font-medium">{value}</dd>
		</div>
	);
}
