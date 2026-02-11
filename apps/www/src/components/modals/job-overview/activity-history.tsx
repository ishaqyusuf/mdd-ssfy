import { useJobOverviewContext } from "@/contexts/job-overview-context";
import { CheckCircle2 } from "lucide-react";

const history = [
    {
        id: 1,
        type: "System",
        title: "Job Created",
        date: "Oct 24, 10:00 AM",
        user: "Admin",
    },
    {
        id: 2,
        type: "Submission",
        title: "Job Submitted",
        date: "Oct 25, 04:30 PM",
        user: "Alex Thompson",
    },
];
export function ActivityHistory() {
    const { overview } = useJobOverviewContext();

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">
                Activity Timeline
            </h4>
            <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-border">
                {/* New Event (Current Action) */}

                <div className="relative pl-8 animate-in slide-in-from-left-2">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-green-500 border-4 border-card z-10 flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-white" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground">
                        Just now
                    </p>
                    <p className="text-sm font-bold text-foreground">
                        Approved by You
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Payment processing initiated.
                    </p>
                </div>

                {history.map((event) => (
                    <div key={event.id} className="relative pl-8">
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-muted border-4 border-card z-10 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">
                            {event.date}
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            By {event.user}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
