import { redirect } from "next/navigation";
import LegacySquarePaymentPage from "./legacy-square-payment-page";

type PageProps = {
	params: Promise<{
		emailToken: string;
		orderIds: string;
	}>;
	searchParams: Promise<{
		uid?: string | string[];
	}>;
};

function getRedirectUid(uid?: string | string[]) {
	if (Array.isArray(uid)) return uid[0];
	return uid;
}

export default async function Page(props: PageProps) {
	const searchParams = await props.searchParams;
	const redirectUid = getRedirectUid(searchParams.uid);

	if (redirectUid) {
		redirect(`/checkout/${encodeURIComponent(redirectUid)}/v2`);
	}

	return <LegacySquarePaymentPage params={props.params} />;
}
