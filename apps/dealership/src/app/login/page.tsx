import { DealerAuthLayout } from "@/components/dealer-auth-layout";
import { isDealerDevQuickLoginEnabled } from "@gnd/auth/better-auth/dealership";
import { db } from "@gnd/db";
import type { DevQuickLoginDealer } from "./dev-quick-login";
import { DealerLoginForm } from "./login-form";

type DealerLoginPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DealerLoginPage({
	searchParams,
}: DealerLoginPageProps) {
	const [devQuickLoginDealers, rawSearchParams] = await Promise.all([
		getDevQuickLoginDealers(),
		searchParams,
	]);
	const callbackURL = getLoginCallbackUrl(rawSearchParams);

	return (
		<DealerAuthLayout
			description="Use your verified dealer credentials to continue to quotes, orders, customers, and company settings."
			eyebrow="Secure dealer access"
			title="Welcome back"
		>
			<DealerLoginForm
				callbackURL={callbackURL}
				devQuickLoginDealers={devQuickLoginDealers}
			/>
		</DealerAuthLayout>
	);
}

async function getDevQuickLoginDealers(): Promise<DevQuickLoginDealer[]> {
	if (!isDealerDevQuickLoginEnabled()) return [];

	const dealers = await db.dealerAuth.findMany({
		orderBy: [{ companyName: "asc" }, { name: "asc" }, { email: "asc" }],
		select: {
			companyName: true,
			dealer: {
				select: {
					businessName: true,
					name: true,
				},
			},
			email: true,
			id: true,
			name: true,
		},
		where: {
			authUserId: {
				not: null,
			},
			deletedAt: null,
			OR: [{ restricted: false }, { restricted: null }],
			status: {
				in: ["active", "approved"],
			},
		},
	});

	return dealers.map((dealer) => {
		const label =
			dealer.companyName ||
			dealer.dealer?.businessName ||
			dealer.name ||
			dealer.dealer?.name ||
			dealer.email;

		return {
			email: dealer.email,
			id: dealer.id,
			label,
			secondaryLabel: label === dealer.email ? null : dealer.email,
		};
	});
}

function getLoginCallbackUrl(
	searchParams: Record<string, string | string[] | undefined>,
) {
	const returnTo = searchParams.return_to;
	if (typeof returnTo === "string" && returnTo.startsWith("/")) {
		return returnTo;
	}

	return "/";
}
