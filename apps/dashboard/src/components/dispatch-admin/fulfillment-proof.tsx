"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import { Skeleton } from "@gnd/ui/skeleton";

export function FulfillmentProof({
	salesId,
	fulfillmentId,
}: { salesId: number; fulfillmentId: number }) {
	const trpc = useTRPC();
	const query = useQuery(
		trpc.dispatch.fulfillmentProof.queryOptions({ salesId, fulfillmentId }),
	);
	if (query.isPending) return <Skeleton className="h-48" />;
	if (query.isError)
		return (
			<div role="alert">
				<p>{query.error.message}</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Try again
				</Button>
			</div>
		);
	const { proof, documents } = query.data;
	return (
		<section aria-label="Delivery proof" className="space-y-4 text-sm">
			<h3 className="font-semibold">Delivery proof</h3>
			{!proof ? (
				<p className="text-muted-foreground">
					No completion proof recorded for this fulfillment.
				</p>
			) : (
				<>
					<Badge variant="secondary">
						{proof.status === "completed"
							? "Proof completed"
							: "Proof upload in progress"}
					</Badge>
					<dl className="grid grid-cols-2 gap-4">
						<div>
							<dt className="text-muted-foreground">Signature</dt>
							<dd>
								{proof.signatureRegistered ? "Registered" : "Not registered"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Photos recorded</dt>
							<dd>{proof.photoCount}</dd>
						</div>
					</dl>
					{proof.completedAt && (
						<p>
							Proof completed {new Date(proof.completedAt).toLocaleString()}
						</p>
					)}
					<h4 className="font-medium">Registered documents</h4>
					{documents.length ? (
						<ul className="divide-y rounded-md border">
							{documents.map((document) => (
								<li key={document.id} className="p-3">
									<p>{document.filename || document.kind}</p>
									<p className="text-xs text-muted-foreground">
										{document.mimeType || document.kind}
									</p>
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground">
							No registered documents are available.
						</p>
					)}
				</>
			)}
		</section>
	);
}
