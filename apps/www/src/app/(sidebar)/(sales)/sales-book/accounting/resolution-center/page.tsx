import { SalesResolutionCenterPage } from "@/components/sales-book/resolution-center-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Payment Resolution - gndprodesk.com",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: Props) {
	return <SalesResolutionCenterPage searchParams={searchParams} />;
}
