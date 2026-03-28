import CommunitySummaryWidgets from "@/components/widgets/community-summary-widgets";
import { CommunityTabs } from "@/components/community-tabs";
export default async function Layout({ children }) {
    return (
        <div className="flex flex-col gap-6">
            <CommunitySummaryWidgets />
            <CommunityTabs />
            {children}
        </div>
    );
}

