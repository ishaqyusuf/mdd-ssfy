import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import CommissionPayments from "@/components/sales-rep-commission-payment";
import PendingCommissions from "@/components/sales-rep-pending-comissions";
import CustomerProfile from "@/components/sales-rep-profile";
import RecentQuotes from "@/components/sales-rep-recent-quotes";
import RecentSales from "@/components/sales-rep-recent-sales";
import SalesChart from "@/components/sales-rep-sales-chart";
import { CalendarIcon, DollarSign, Plus, Users } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

// import CommissionPayments from "./commission-payments";
// import CustomerProfile from "./customer-profile";
// import PendingCommissions from "./pending-commissions";
// import RecentQuotes from "./recent-quotes";
// import RecentSales from "./recent-sales";
// import SalesChart from "./sales-chart";

export default function SalesRepProfile() {
    return (
        <FPage can={["viewOrders"]} title="Sales Rep Profile">
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Sales Rep Profile
                        </h2>
                        <p className="text-muted-foreground">
                            Manage your sales activities and track performance
                        </p>
                    </div>
                    <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Sale
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Sales
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">$45,231.89</div>
                            <p className="text-xs text-muted-foreground">
                                +20.1% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Commission Earned
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">$4,523.19</div>
                            <p className="text-xs text-muted-foreground">
                                +10.5% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Active Customers
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+32</div>
                            <p className="text-xs text-muted-foreground">
                                +12.3% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Pending Commission
                            </CardTitle>
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">$1,893.42</div>
                            <p className="text-xs text-muted-foreground">
                                5 pending payments
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Sales Performance</CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline">Monthly</Badge>
                                    <Badge variant="outline">Quarterly</Badge>
                                    <Badge variant="secondary">Yearly</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <SalesChart />
                        </CardContent>
                    </Card>
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Sales Rep Information</CardTitle>
                            <CardDescription>
                                Personal and performance details
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage
                                        src="/placeholder.svg?height=80&width=80"
                                        alt="Sales Rep"
                                    />
                                    <AvatarFallback>SR</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold">
                                        Sarah Johnson
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Senior Sales Representative
                                    </p>
                                    <div className="mt-2 flex flex-col space-y-1">
                                        <div className="flex items-center text-sm">
                                            <span className="font-medium">
                                                ID:
                                            </span>
                                            <span className="ml-2">
                                                SR-2023-0042
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm">
                                            <span className="font-medium">
                                                Region:
                                            </span>
                                            <span className="ml-2">
                                                Northeast
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm">
                                            <span className="font-medium">
                                                Commission Rate:
                                            </span>
                                            <span className="ml-2">10%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="recent-sales" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="recent-sales">
                            Recent Sales
                        </TabsTrigger>
                        <TabsTrigger value="recent-quotes">
                            Recent Quotes
                        </TabsTrigger>
                        {/* <TabsTrigger  value="customer-profile">
                        Customer Profile
                    </TabsTrigger> */}
                        <TabsTrigger value="commission">Commission</TabsTrigger>
                    </TabsList>
                    <TabsContent value="recent-sales" className="space-y-4">
                        <RecentSales />
                    </TabsContent>
                    <TabsContent value="recent-quotes" className="space-y-4">
                        <RecentQuotes />
                    </TabsContent>
                    <TabsContent value="customer-profile" className="space-y-4">
                        <CustomerProfile />
                    </TabsContent>
                    <TabsContent value="commission" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <CommissionPayments />
                            <PendingCommissions />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </FPage>
    );
}
