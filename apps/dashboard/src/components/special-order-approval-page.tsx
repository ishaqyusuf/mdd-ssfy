"use client";

import { SignaturePad } from "@/components/signature-pad";
import { SpecialOrderOrderReview } from "@/components/special-order-order-review";
import { getBaseUrl } from "@/lib/base-url";
import { useTRPC } from "@/trpc/client";
import { SalesHtmlAddressBlocks } from "@gnd/pdf/sales-v2";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { useState } from "react";

function readObject(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function text(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function SpecialOrderApprovalPage({ token }: { token: string }) {
	const trpc = useTRPC();
	const baseUrl = getBaseUrl();
	const review = useQuery(
		trpc.specialOrder.publicReview.queryOptions({ token }),
	);
	const [mode, setMode] = useState<"APPROVE" | "DECLINE">("APPROVE");
	const [acknowledged, setAcknowledged] = useState(false);
	const [printedName, setPrintedName] = useState("");
	const [signature, setSignature] = useState("");
	const [declineReason, setDeclineReason] = useState("");
	const respond = useMutation(
		trpc.specialOrder.respond.mutationOptions({
			onSuccess: () => review.refetch(),
		}),
	);

	if (review.isPending) {
		return (
			<div className="mx-auto mt-20 h-80 max-w-3xl animate-pulse rounded-md bg-muted" />
		);
	}
	if (review.error || !review.data) {
		return (
			<main className="min-h-screen bg-muted/30 px-4 py-16">
				<Alert variant="destructive" className="mx-auto max-w-xl">
					<AlertTitle>Approval link unavailable</AlertTitle>
					<AlertDescription>
						This link is invalid. Contact your salesperson for a current
						request.
					</AlertDescription>
				</Alert>
			</main>
		);
	}

	const data = review.data;
	if (data.state !== "ACTIVE") {
		return (
			<main className="min-h-screen bg-muted/30 px-4 py-16">
				<Card className="mx-auto max-w-xl">
					<CardHeader>
						<CardTitle>
							{data.state === "COMPLETED"
								? "Response recorded"
								: "Current request required"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							{data.state === "COMPLETED"
								? `Order ${data.orderNo} has already been ${data.outcome?.toLowerCase() || "completed"}. This link cannot be reused.`
								: data.message}
						</p>
					</CardContent>
				</Card>
			</main>
		);
	}

	const form = data.order.form;
	const canApprove =
		acknowledged && printedName.trim().length >= 2 && signature;
	const canDecline = declineReason.trim().length >= 1;

	return (
		<main className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
			<div className="mx-auto max-w-3xl space-y-6">
				<header>
					<div className="flex flex-wrap items-center gap-2">
						<Badge>Special Order</Badge>
						<Badge variant="outline">Order {data.orderNo}</Badge>
					</div>
					<h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
						Review and acknowledge your order
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Review every item, price, and specification before responding. This
						link expires {new Date(data.expiresAt).toLocaleString()}.
					</p>
				</header>

				<Card>
					<CardHeader>
						<CardTitle>Order details</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid gap-4 text-sm sm:grid-cols-2">
							<div>
								<dt className="text-muted-foreground">Customer</dt>
								<dd className="font-medium">{data.customerName}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Salesperson</dt>
								<dd className="font-medium">
									{data.salespersonName || "Sales team"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Purchase order</dt>
								<dd>{text(form.po) || "—"}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Order date</dt>
								<dd>
									{text(form.createdAt)
										? new Date(String(form.createdAt)).toLocaleDateString()
										: "—"}
								</dd>
							</div>
						</dl>
						<SalesHtmlAddressBlocks
							billing={data.order.billing}
							shipping={data.order.shipping}
						/>
					</CardContent>
				</Card>

				<SpecialOrderOrderReview order={data.order} baseUrl={baseUrl} />

				<Card>
					<CardHeader className="flex-row items-center justify-between gap-3">
						<CardTitle>{data.policy.title}</CardTitle>
						<Badge variant="outline">Policy v{data.policy.version}</Badge>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="whitespace-pre-wrap text-sm leading-6">
							{data.policy.policyText}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Your response</CardTitle>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant={mode === "APPROVE" ? "default" : "outline"}
								onClick={() => setMode("APPROVE")}
							>
								Approve
							</Button>
							<Button
								variant={mode === "DECLINE" ? "destructive" : "outline"}
								onClick={() => setMode("DECLINE")}
							>
								Decline
							</Button>
						</div>

						{mode === "APPROVE" ? (
							<FieldGroup>
								<Field orientation="horizontal">
									<Checkbox
										id="special-order-acknowledgment"
										checked={acknowledged}
										onCheckedChange={(checked) =>
											setAcknowledged(checked === true)
										}
									/>
									<FieldLabel htmlFor="special-order-acknowledgment">
										{data.policy.acknowledgmentText}
									</FieldLabel>
								</Field>
								<Field>
									<FieldLabel htmlFor="special-order-printed-name">
										Printed name
									</FieldLabel>
									<Input
										id="special-order-printed-name"
										value={printedName}
										onChange={(event) => setPrintedName(event.target.value)}
										autoComplete="name"
									/>
									<FieldDescription>
										Your signature represents the person using this secure link;
										it does not independently verify legal identity.
									</FieldDescription>
								</Field>
								<SignaturePad
									signatureId="special-order-signature"
									onSignatureChange={setSignature}
								/>
							</FieldGroup>
						) : (
							<Field>
								<FieldLabel htmlFor="special-order-decline-reason">
									Why are you declining?
								</FieldLabel>
								<Textarea
									id="special-order-decline-reason"
									rows={4}
									value={declineReason}
									onChange={(event) => setDeclineReason(event.target.value)}
								/>
							</Field>
						)}

						{respond.error ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to record response</AlertTitle>
								<AlertDescription>{respond.error.message}</AlertDescription>
							</Alert>
						) : null}

						<Button
							className="w-full"
							variant={mode === "DECLINE" ? "destructive" : "default"}
							disabled={
								respond.isPending ||
								(mode === "APPROVE" ? !canApprove : !canDecline)
							}
							onClick={() =>
								respond.mutate({
									token,
									decision: mode,
									acknowledged: mode === "APPROVE" ? acknowledged : undefined,
									printedName: mode === "APPROVE" ? printedName : null,
									signatureDataUrl: mode === "APPROVE" ? signature : null,
									declineReason: mode === "DECLINE" ? declineReason : null,
								})
							}
						>
							{respond.isPending
								? "Recording response…"
								: mode === "APPROVE"
									? "Approve and sign"
									: "Decline order"}
						</Button>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
