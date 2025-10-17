import { Download } from "lucide-react";

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
import { CommissionPaymentsWidget } from "./widgets/commission-payments";
import { Env } from "@/components/env";

export default function CommissionPayments() {
    const commissionPayments = [
        {
            id: "CP-2023-001",
            date: "2023-10-31",
            amount: "$1,250.00",
            salesPeriod: "October 2023",
            status: "Paid",
        },
        {
            id: "CP-2023-002",
            date: "2023-09-30",
            amount: "$980.00",
            salesPeriod: "September 2023",
            status: "Paid",
        },
        {
            id: "CP-2023-003",
            date: "2023-08-31",
            amount: "$1,100.00",
            salesPeriod: "August 2023",
            status: "Paid",
        },
        {
            id: "CP-2023-004",
            date: "2023-07-31",
            amount: "$850.00",
            salesPeriod: "July 2023",
            status: "Paid",
        },
        {
            id: "CP-2023-005",
            date: "2023-06-30",
            amount: "$920.00",
            salesPeriod: "June 2023",
            status: "Paid",
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Commission Payments</CardTitle>
                <CardDescription>
                    History of your commission payments
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CommissionPaymentsWidget />
                <Env isDev>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Payment ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">
                                    Receipt
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {commissionPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">
                                        {payment.id}
                                    </TableCell>
                                    <TableCell>{payment.date}</TableCell>
                                    <TableCell>{payment.salesPeriod}</TableCell>
                                    <TableCell>{payment.amount}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <Download className="h-4 w-4" />
                                            <span className="sr-only">
                                                Download receipt
                                            </span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing 5 of 24 payments
                        </p>
                        <Button variant="outline" size="sm">
                            View All
                        </Button>
                    </div>
                </Env>
            </CardContent>
        </Card>
    );
}
