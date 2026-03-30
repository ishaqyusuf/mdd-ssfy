import { prisma } from "@/db";
import SalesDownload from "./sales";

import PageShell from "@/components/page-shell";
export default async function DownloadPage(props) {
	const params = await props.params;
	const [path, token, slug]: ["sales", string, string] = params.slugs;

	const order = await prisma.salesOrders.findFirst({
		where: {
			orderId: slug?.toString(),
		},
	});

	// return <></>;
	return (
		<PageShell>
			{" "}
			<SalesDownload id={order.orderId} mode={order.type} />
		</PageShell>
	);
}
