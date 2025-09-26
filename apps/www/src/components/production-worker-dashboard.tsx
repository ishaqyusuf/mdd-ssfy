"use client";

import { useState } from "react";
import { useMobile } from "@/hooks/use-mobile";
import {
    BarChart,
    Bell,
    Calendar,
    ChevronDown,
    Clock,
    DollarSign,
    Filter,
    Package,
    Search,
    User,
    Wallet,
} from "lucide-react";
import {
    Bar,
    CartesianGrid,
    BarChart as RechartsBarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@gnd/ui/chart";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Input } from "@gnd/ui/input";
import { Progress } from "@gnd/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { ProductionAlertWidget } from "./production-alert-widget";

// Sample data for assigned jobs
const assignedJobs = [
    {
        id: "ORD-7893",
        customer: "Acme Industries",
        items: [
            { name: "Custom Widget", quantity: 50 },
            { name: "Precision Parts", quantity: 25 },
        ],
        totalQuantity: 75,
        dueDate: "2023-05-15",
        status: "in-progress",
        progress: 65,
    },
    {
        id: "ORD-6547",
        customer: "TechCorp Solutions",
        items: [{ name: "Circuit Boards", quantity: 100 }],
        totalQuantity: 100,
        dueDate: "2023-05-18",
        status: "in-progress",
        progress: 30,
    },
    {
        id: "ORD-5421",
        customer: "Global Manufacturing",
        items: [
            { name: "Steel Components", quantity: 200 },
            { name: "Aluminum Frames", quantity: 50 },
        ],
        totalQuantity: 250,
        dueDate: "2023-05-20",
        status: "not-started",
        progress: 0,
    },
    {
        id: "ORD-4398",
        customer: "Precision Tooling Inc",
        items: [{ name: "Machined Parts", quantity: 75 }],
        totalQuantity: 75,
        dueDate: "2023-05-25",
        status: "in-progress",
        progress: 15,
    },
    {
        id: "ORD-3276",
        customer: "BuildRight Construction",
        items: [
            { name: "Custom Fixtures", quantity: 30 },
            { name: "Metal Brackets", quantity: 120 },
        ],
        totalQuantity: 150,
        dueDate: "2023-05-30",
        status: "not-started",
        progress: 0,
    },
];

// Sample data for commission
const commissionData = {
    paid: 3250.75,
    pending: 1875.5,
    total: 5126.25,
    monthlyTarget: 6000,
    history: [
        { month: "Jan", commission: 2800 },
        { month: "Feb", commission: 3200 },
        { month: "Mar", commission: 2900 },
        { month: "Apr", commission: 3500 },
        { month: "May", commission: 3250 },
    ],
};

// Sample data for performance metrics
const performanceMetrics = {
    completionRate: 94,
    qualityScore: 98,
    efficiencyRating: 92,
};

export default function ProductionWorkerDashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const isMobile = useMobile();

    // Filter jobs based on search query
    const filteredJobs = assignedJobs.filter(
        (job) =>
            job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.customer.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge className="bg-green-500">Completed</Badge>;
            case "in-progress":
                return <Badge className="bg-blue-500">In Progress</Badge>;
            case "not-started":
                return <Badge className="bg-amber-500">Not Started</Badge>;
            default:
                return <Badge>Unknown</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(date);
    };

    const getDaysRemaining = (dateString: string) => {
        const dueDate = new Date(dateString);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
                <div className="flex flex-1 items-center gap-2">
                    <Package className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">
                        Production Dashboard
                    </h1>
                </div>
                <div className="flex flex-1 items-center justify-end gap-4">
                    <Button variant="outline" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            3
                        </span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarImage
                                        src="/placeholder-user.jpg"
                                        alt="User"
                                    />
                                    <AvatarFallback>JD</AvatarFallback>
                                </Avatar>
                                <span className="hidden sm:inline-block">
                                    John Doe
                                </span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Wallet className="mr-2 h-4 w-4" />
                                Commission History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Log out</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <main className="flex-1 space-y-6 p-4 sm:p-6">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <h2 className="text-2xl font-bold tracking-tight">
                        Welcome back, John
                    </h2>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search orders..."
                                className="w-full pl-8 sm:w-[250px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Assigned Jobs
                            </CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {assignedJobs.length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {
                                    assignedJobs.filter(
                                        (job) => job.status === "in-progress",
                                    ).length
                                }{" "}
                                in progress
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Paid Commission
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${commissionData.paid.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                ${commissionData.pending.toFixed(2)} pending
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Completion Rate
                            </CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {performanceMetrics.completionRate}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Last 30 days
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Quality Score
                            </CardTitle>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {performanceMetrics.qualityScore}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                +2% from last month
                            </p>
                        </CardContent>
                    </Card>
                </div>
                <ProductionAlertWidget />
                <Tabs defaultValue="assigned-jobs" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="assigned-jobs">
                            Due Today <Badge variant="destructive">9</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="past-due">
                            Past Due<Badge variant="destructive">9</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="assignment">
                            All Assignments
                        </TabsTrigger>
                        <TabsTrigger value="commission">Commission</TabsTrigger>
                    </TabsList>
                    <TabsContent value="assigned-jobs" className="space-y-4">
                        <div className="grid gap-4">
                            {isMobile ? (
                                // Mobile view - cards
                                <div className="grid gap-4">
                                    {filteredJobs.map((job) => (
                                        <Card key={job.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-lg">
                                                        {job.id}
                                                    </CardTitle>
                                                    {getStatusBadge(job.status)}
                                                </div>
                                                <CardDescription>
                                                    {job.customer}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pb-2">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">
                                                            Items:
                                                        </span>
                                                        <span className="font-medium">
                                                            {job.totalQuantity}{" "}
                                                            units
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {job.items.map(
                                                            (item, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex justify-between text-xs text-muted-foreground"
                                                                >
                                                                    <span>
                                                                        {
                                                                            item.name
                                                                        }
                                                                    </span>
                                                                    <span>
                                                                        x
                                                                        {
                                                                            item.quantity
                                                                        }
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">
                                                            Due Date:
                                                        </span>
                                                        <span className="font-medium">
                                                            {formatDate(
                                                                job.dueDate,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">
                                                            Time Remaining:
                                                        </span>
                                                        <span className="font-medium">
                                                            {getDaysRemaining(
                                                                job.dueDate,
                                                            )}{" "}
                                                            days
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Progress:
                                                            </span>
                                                            <span className="font-medium">
                                                                {job.progress}%
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={job.progress}
                                                            className="h-2"
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    View Details
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                // Desktop view - table
                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Order ID</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Items</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Progress</TableHead>
                                                <TableHead className="text-right">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredJobs.map((job) => (
                                                <TableRow key={job.id}>
                                                    <TableCell className="font-medium">
                                                        {job.id}
                                                    </TableCell>
                                                    <TableCell>
                                                        {job.customer}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {
                                                                    job.totalQuantity
                                                                }{" "}
                                                                units
                                                            </span>
                                                            {job.items.map(
                                                                (
                                                                    item,
                                                                    index,
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="text-xs text-muted-foreground"
                                                                    >
                                                                        {
                                                                            item.name
                                                                        }{" "}
                                                                        (x
                                                                        {
                                                                            item.quantity
                                                                        }
                                                                        )
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>
                                                                {formatDate(
                                                                    job.dueDate,
                                                                )}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {getDaysRemaining(
                                                                    job.dueDate,
                                                                )}{" "}
                                                                days remaining
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(
                                                            job.status,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs">
                                                                {job.progress}%
                                                            </span>
                                                            <Progress
                                                                value={
                                                                    job.progress
                                                                }
                                                                className="h-2"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button size="sm">
                                                            View Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="commission" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Commission Wallet</CardTitle>
                                    <CardDescription>
                                        Your current commission earnings and
                                        pending payments
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium">
                                                    Paid
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-green-600">
                                                    $
                                                    {commissionData.paid.toFixed(
                                                        2,
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium">
                                                    Pending
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-amber-600">
                                                    $
                                                    {commissionData.pending.toFixed(
                                                        2,
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Total Earnings
                                            </span>
                                            <span className="font-medium">
                                                $
                                                {commissionData.total.toFixed(
                                                    2,
                                                )}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    Monthly Target
                                                </span>
                                                <span>
                                                    $
                                                    {commissionData.monthlyTarget.toFixed(
                                                        2,
                                                    )}
                                                </span>
                                            </div>
                                            <Progress
                                                value={
                                                    (commissionData.total /
                                                        commissionData.monthlyTarget) *
                                                    100
                                                }
                                                className="h-2"
                                            />
                                            <p className="text-right text-xs text-muted-foreground">
                                                {(
                                                    (commissionData.total /
                                                        commissionData.monthlyTarget) *
                                                    100
                                                ).toFixed(1)}
                                                % of monthly target
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="outline" size="sm">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Payment Schedule
                                        </Button>
                                        <Button size="sm">
                                            <Wallet className="mr-2 h-4 w-4" />
                                            View History
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Commission Trend</CardTitle>
                                    <CardDescription>
                                        Your commission earnings over the past
                                        months
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ChartContainer
                                            config={{
                                                commission: {
                                                    label: "Commission",
                                                    color: "hsl(var(--chart-1))",
                                                },
                                            }}
                                        >
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <RechartsBarChart
                                                    data={
                                                        commissionData.history
                                                    }
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        vertical={false}
                                                    />
                                                    <XAxis dataKey="month" />
                                                    <YAxis />
                                                    <ChartTooltip
                                                        content={
                                                            <ChartTooltipContent />
                                                        }
                                                    />
                                                    <Bar
                                                        dataKey="commission"
                                                        fill="var(--color-commission)"
                                                        radius={[4, 4, 0, 0]}
                                                        name="Commission"
                                                    />
                                                </RechartsBarChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>May 10, 2023</TableCell>
                                            <TableCell>ORD-7245</TableCell>
                                            <TableCell>
                                                Acme Industries
                                            </TableCell>
                                            <TableCell>$450.00</TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-500">
                                                    Paid
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>May 5, 2023</TableCell>
                                            <TableCell>ORD-6932</TableCell>
                                            <TableCell>
                                                TechCorp Solutions
                                            </TableCell>
                                            <TableCell>$325.75</TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-500">
                                                    Paid
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>May 1, 2023</TableCell>
                                            <TableCell>ORD-6547</TableCell>
                                            <TableCell>
                                                Global Manufacturing
                                            </TableCell>
                                            <TableCell>$275.50</TableCell>
                                            <TableCell>
                                                <Badge className="bg-amber-500">
                                                    Pending
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Apr 28, 2023</TableCell>
                                            <TableCell>ORD-6123</TableCell>
                                            <TableCell>
                                                Precision Tooling Inc
                                            </TableCell>
                                            <TableCell>$600.00</TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-500">
                                                    Paid
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full">
                                    View All Payments
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
