import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { SecondaryMenu } from "@/components/secondary-menu";
import { PageTitle } from "@gnd/ui/custom/page-title";

const salesSettingsItems = [
	{ path: "/settings/sales", label: "Documents" },
	{ path: "/settings/sales/overview", label: "Sales overview" },
	{ path: "/settings/sales/dealer-orders", label: "Dealer orders" },
	{ path: "/settings/sales/special-orders", label: "Special orders" },
];

export default function SalesSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageShell>
			<ScrollableContent>
				<div className="mx-auto flex w-full max-w-[920px] flex-col gap-6 pb-12">
					<header>
						<PageTitle>Sales Settings</PageTitle>
						<p className="text-sm text-muted-foreground">
							Configure sales views, documents, and order operations.
						</p>
					</header>
					<SecondaryMenu
						ariaLabel="Sales settings sections"
						items={salesSettingsItems}
					/>
					<main>{children}</main>
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
