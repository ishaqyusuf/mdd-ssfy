import PageShell from "@/components/page-shell";
import { StorefrontNav } from "@/components/storefront/storefront-nav";
import { PageTitle } from "@gnd/ui/custom/page-title";

export default function StorefrontLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageShell className="gap-5">
			<div className="space-y-3">
				<PageTitle>Storefront</PageTitle>
				<StorefrontNav />
			</div>
			{children}
		</PageShell>
	);
}
