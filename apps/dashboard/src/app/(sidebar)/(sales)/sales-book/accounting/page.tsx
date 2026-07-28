import { SalesBookAccountingPage } from "@/components/sales-book/accounting-page";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Accounting | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: Props) {
	return <SalesBookAccountingPage searchParams={searchParams} />;
}
