import CommunitySummaryWidgets from "@/components/widgets/community-summary-widgets";

export default async function Layout({ children }) {
    return (
        <div className="flex flex-col gap-6">
            <CommunitySummaryWidgets />
            {children}
        </div>
    );
}
