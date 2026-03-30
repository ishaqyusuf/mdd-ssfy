import HomePrinter from "@/components/_v1/print/home/home-printer";
import OrderPrinter from "@/components/_v1/print/order/order-printer";

import PageShell from "@/components/page-shell";
export default async function PrintSalesPage(props) {
	const searchParams = await props.searchParams;
	return (
		<PageShell>
			<HomePrinter
				{...searchParams}
				id={searchParams?.id?.split(",").map((n) => Number(n))}
			/>
		</PageShell>
	);
}
