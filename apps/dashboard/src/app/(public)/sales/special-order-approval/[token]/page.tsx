import { SpecialOrderApprovalPage } from "@/components/special-order-approval-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({ title: "Review Special Order | GND" });
}

export default async function Page({
	params,
}: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	return <SpecialOrderApprovalPage token={token} />;
}
