import { notFound } from "next/navigation";

import { AuthGuard } from "@/components/auth-guard";
import { WorkflowPrototype } from "@/components/dispatch-admin/workflow-prototype/workflow-prototype";
import PageShell from "@/components/page-shell";
import { _perm } from "@/components/sidebar-links";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({ title: "Fulfillment workflow prototype | GND" });
}

export default function FulfillmentWorkflowPrototypePage() {
	if (process.env.NODE_ENV === "production") notFound();

	return (
		<PageShell className="max-w-[1680px]">
			<AuthGuard
				rules={[_perm.is("editOrders")]}
				Fallback={
					<div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
						You do not have permission to review fulfillment workflows.
					</div>
				}
			>
				<WorkflowPrototype />
			</AuthGuard>
		</PageShell>
	);
}
