import { CommunityTabs } from "@/components/community-tabs";
import CommunitySummaryWidgets from "@/components/widgets/community-summary-widgets";

export default async function Layout({ children }) {
    return (
        <div className="pt-6 flex flex-col gap-6">
            <CommunitySummaryWidgets />
            <CommunityTabs />
            {children}
        </div>
    );
}

