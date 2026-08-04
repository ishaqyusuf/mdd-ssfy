import { SalesAdjustmentApprovalPage } from "@/components/sales-adjustment-approval-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({ title: "Review sale change | GND" });
}

export default async function Page({
	params,
}: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	return <SalesAdjustmentApprovalPage token={token} />;
}
