import { BugReportWorkspace } from "@/components/bug-reports/bug-report-workspace";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
    return constructMetadata({
        title: "Bug Reports | GND",
    });
}

export default function Page() {
    return (
        <PageShell className="gap-6">
            <PageTitle>Bug Reports</PageTitle>
            <BugReportWorkspace />
        </PageShell>
    );
}

