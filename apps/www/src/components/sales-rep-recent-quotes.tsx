import { Eye, FileText } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

export default function RecentQuotes() {
    const recentQuotes = [
        {
            id: "Q-2023-001",
            customer: "Acme Corp",
            amount: "$15,000.00",
            date: "2023-11-18",
            status: "Pending",
            expiryDate: "2023-12-18",
        },
        {
            id: "Q-2023-002",
            customer: "TechGiant Inc",
            amount: "$9,500.00",
            date: "2023-11-15",
            status: "Accepted",
            expiryDate: "2023-12-15",
        },
        {
            id: "Q-2023-003",
            customer: "Global Solutions",
            amount: "$7,200.00",
            date: "2023-11-12",
            status: "Pending",
            expiryDate: "2023-12-12",
        },
        {
            id: "Q-2023-004",
            customer: "Innovative Startups",
            amount: "$4,800.00",
            date: "2023-11-10",
            status: "Expired",
            expiryDate: "2023-11-25",
        },
        {
            id: "Q-2023-005",
            customer: "Local Business LLC",
            amount: "$2,500.00",
            date: "2023-11-05",
            status: "Rejected",
            expiryDate: "2023-12-05",
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Accepted":
                return "success";
            case "Pending":
                return "warning";
            case "Expired":
            case "Rejected":
                return "destructive";
            default:
                return "default";
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Quotes</CardTitle>
                    <CardDescription>
                        Your most recent quote proposals
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                    View All
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Quote ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentQuotes.map((quote) => (
                            <TableRow key={quote.id}>
                                <TableCell className="font-medium">
                                    {quote.id}
                                </TableCell>
                                <TableCell>{quote.customer}</TableCell>
                                <TableCell>{quote.amount}</TableCell>
                                <TableCell>{quote.date}</TableCell>
                                <TableCell>{quote.expiryDate}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            getStatusColor(quote.status) as any
                                        }
                                    >
                                        {quote.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon">
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">
                                            View details
                                        </span>
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <FileText className="h-4 w-4" />
                                        <span className="sr-only">
                                            View document
                                        </span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
