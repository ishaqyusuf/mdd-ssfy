import { Badge } from "@gnd/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";

export default function PendingCommissions() {
    const pendingCommissions = [
        {
            id: "PC-2023-001",
            customer: "Acme Corp",
            saleAmount: "$12,500.00",
            commissionAmount: "$1,250.00",
            status: "Processing",
            expectedDate: "2023-11-30",
            progress: 75,
        },
        {
            id: "PC-2023-002",
            customer: "TechGiant Inc",
            saleAmount: "$8,750.00",
            commissionAmount: "$875.00",
            status: "Pending Approval",
            expectedDate: "2023-11-30",
            progress: 50,
        },
        {
            id: "PC-2023-003",
            customer: "Global Solutions",
            saleAmount: "$5,200.00",
            commissionAmount: "$520.00",
            status: "Awaiting Payment",
            expectedDate: "2023-12-15",
            progress: 25,
        },
        {
            id: "PC-2023-004",
            customer: "Innovative Startups",
            saleAmount: "$3,800.00",
            commissionAmount: "$380.00",
            status: "Processing",
            expectedDate: "2023-12-15",
            progress: 60,
        },
        {
            id: "PC-2023-005",
            customer: "Local Business LLC",
            saleAmount: "$1,500.00",
            commissionAmount: "$150.00",
            status: "Pending Approval",
            expectedDate: "2023-12-31",
            progress: 30,
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Processing":
                return "warning";
            case "Pending Approval":
                return "secondary";
            case "Awaiting Payment":
                return "info";
            default:
                return "default";
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Commissions</CardTitle>
                <CardDescription>
                    Commissions awaiting processing and payment
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pendingCommissions.map((commission) => (
                        <div
                            key={commission.id}
                            className="rounded-lg border p-4"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <h4 className="font-medium">
                                    {commission.customer}
                                </h4>
                                <Badge
                                    variant={
                                        getStatusColor(commission.status) as any
                                    }
                                >
                                    {commission.status}
                                </Badge>
                            </div>
                            <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Sale Amount:
                                    </p>
                                    <p className="font-medium">
                                        {commission.saleAmount}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Commission:
                                    </p>
                                    <p className="font-medium">
                                        {commission.commissionAmount}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Expected Date:
                                    </p>
                                    <p>{commission.expectedDate}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">ID:</p>
                                    <p>{commission.id}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>Progress</span>
                                    <span>{commission.progress}%</span>
                                </div>
                                <Progress value={commission.progress} />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
