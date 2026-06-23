import { SalesInboundsWorkspace } from "@/components/sales-inbounds-workspace";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Inbounds | GND",
	});
}

export default function Page() {
	return <SalesInboundsWorkspace />;
}
