import { destroyAuthToken } from "@/actions/destory-auth.token";

import PageShell from "@/components/page-shell";
export default async function ReportLoginToken(props) {
	const token = (await props.searchParams)?.token;
	await destroyAuthToken(token);
	return (
		<PageShell>
			{" "}
			<></>
		</PageShell>
	);
}
