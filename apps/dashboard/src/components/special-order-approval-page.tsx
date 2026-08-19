"use client";

import { SignaturePad } from "@/components/signature-pad";
import { getBaseUrl } from "@/lib/base-url";
import { useTRPC } from "@/trpc/client";
import { SalesHtmlDocument } from "@gnd/pdf/sales-v2";
import type { CompanyAddress, PrintPage } from "@gnd/sales/print";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { useEffect, useState } from "react";

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
	const [isResponseVisible, setIsResponseVisible] = useState(false);
	const [responseElement, setResponseElement] = useState<HTMLDivElement | null>(
		null,
	);
	const respond = useMutation(
		trpc.specialOrder.respond.mutationOptions({
			onSuccess: () => review.refetch(),
		}),
	);

	useEffect(() => {
		if (!responseElement || !window.IntersectionObserver) return;
		const observer = new IntersectionObserver(
			([entry]) => setIsResponseVisible(entry?.isIntersecting === true),
			{ threshold: 0.2 },
		);
		observer.observe(responseElement);
		return () => observer.disconnect();
	}, [responseElement]);

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

	const canApprove =
		acknowledged && printedName.trim().length >= 2 && signature;
	const canDecline = declineReason.trim().length >= 1;
	const chooseResponse = (nextMode: "APPROVE" | "DECLINE") => {
		setMode(nextMode);
		document.getElementById("special-order-response")?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	};

	return (
		<main className="min-h-screen bg-muted/30 px-3 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-28">
			<div className="mx-auto max-w-[980px] space-y-6">
				<SalesHtmlDocument
					pages={[data.order.invoicePage as PrintPage]}
					templateId="template-2"
					companyAddress={data.companyAddress as CompanyAddress}
					baseUrl={baseUrl}
					config={{ showImages: true }}
				/>

				<div
					ref={setResponseElement}
					id="special-order-response"
					className="scroll-mt-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>
								{mode === "APPROVE" ? "Approve order" : "Decline order"}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
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
											Your signature represents the person using this secure
											link; it does not independently verify legal identity.
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
			</div>
			{!isResponseVisible ? (
				<div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
					<div
						className="flex h-12 items-center gap-1 rounded-full border bg-background/85 p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.22)] backdrop-blur-xl"
						role="toolbar"
						aria-label="Order response actions"
					>
						<Button
							type="button"
							size="sm"
							className="rounded-full"
							onClick={() => chooseResponse("APPROVE")}
							aria-controls="special-order-response"
						>
							Approve
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							className="rounded-full"
							onClick={() => chooseResponse("DECLINE")}
							aria-controls="special-order-response"
						>
							Decline
						</Button>
					</div>
				</div>
			) : null}
		</main>
	);
}
