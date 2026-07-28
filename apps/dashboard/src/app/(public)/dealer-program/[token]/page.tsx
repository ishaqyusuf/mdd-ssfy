import { DealerProgramApplicationPage } from "@/components/dealer-program-application-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Dealership Partnership | GND",
	});
}

export default async function Page({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	return <DealerProgramApplicationPage token={token} />;
}
