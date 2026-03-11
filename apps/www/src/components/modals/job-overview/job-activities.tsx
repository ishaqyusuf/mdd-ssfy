import { ActivityHistory as ChatActivityHistory } from "@/components/chat";
import { useJobOverviewContext } from "@/contexts/job-overview-context";

export function JobActivities() {
    const { overview } = useJobOverviewContext();
    const jobId = Number(overview?.id || 0);

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <ChatActivityHistory
                tags={[{ tagName: "jobId", tagValue: jobId }]}
                pageSize={40}
                maxDepth={4}
                emptyText="No activity yet"
            />
        </div>
    );
}
