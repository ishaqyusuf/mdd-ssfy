import { Eye, MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";

export default function RecentSales() {
    const recentSales = [
        {
            id: "S-2023-001",
            customer: {
                name: "Acme Corp",
                image: "/placeholder.svg?height=40&width=40",
                initials: "AC",
            },
            amount: "$12,500.00",
            date: "2023-11-15",
            status: "Completed",
            product: "Enterprise Software License",
        },
        {
            id: "S-2023-002",
            customer: {
                name: "TechGiant Inc",
                image: "/placeholder.svg?height=40&width=40",
                initials: "TG",
            },
            amount: "$8,750.00",
            date: "2023-11-10",
            status: "Completed",
            product: "Cloud Services Package",
        },
        {
            id: "S-2023-003",
            customer: {
                name: "Global Solutions",
                image: "/placeholder.svg?height=40&width=40",
                initials: "GS",
            },
            amount: "$5,200.00",
            date: "2023-11-05",
            status: "Processing",
            product: "Consulting Services",
        },
        {
            id: "S-2023-004",
            customer: {
                name: "Innovative Startups",
                image: "/placeholder.svg?height=40&width=40",
                initials: "IS",
            },
            amount: "$3,800.00",
            date: "2023-11-01",
            status: "Completed",
            product: "Marketing Package",
        },
        {
            id: "S-2023-005",
            customer: {
                name: "Local Business LLC",
                image: "/placeholder.svg?height=40&width=40",
                initials: "LB",
            },
            amount: "$1,500.00",
            date: "2023-10-28",
            status: "Completed",
            product: "Support Contract",
        },
    ];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                        Your most recent sales transactions
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                    View All
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {recentSales.map((sale) => (
                        <div
                            key={sale.id}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center space-x-4">
                                <Avatar>
                                    <AvatarImage
                                        src={
                                            sale.customer.image ||
                                            "/placeholder.svg"
                                        }
                                        alt={sale.customer.name}
                                    />
                                    <AvatarFallback>
                                        {sale.customer.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium">
                                        {sale.customer.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {sale.product}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">
                                            {sale.date}
                                        </p>
                                        <Badge
                                            variant={
                                                sale.status === "Completed"
                                                    ? "success"
                                                    : "outline"
                                            }
                                            className="text-xs"
                                        >
                                            {sale.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <p className="font-medium">{sale.amount}</p>
                                <Button variant="ghost" size="icon">
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">
                                        View details
                                    </span>
                                </Button>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">
                                        More options
                                    </span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
