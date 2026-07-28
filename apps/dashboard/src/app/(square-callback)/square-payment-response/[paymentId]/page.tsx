import SquareCallback from "@/components/square-callback";

import PageShell from "@/components/page-shell";
export default async function SquarePaymentResponse(props) {
	const params = await props.params;
	return (
		<PageShell>
			{" "}
			<SquareCallback params={params} />
		</PageShell>
	);
}
