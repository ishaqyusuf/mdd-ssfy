import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { ReliabilityReview } from "@/components/settings/reliability-review";
import { PageTitle } from "@gnd/ui/custom/page-title";

export default function Page() {
	return (
		<PageShell>
			<ScrollableContent>
				<div className="space-y-6">
					<PageTitle>Reliability review</PageTitle>
					<ReliabilityReview />
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
