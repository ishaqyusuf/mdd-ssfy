import {
    Building,
    Calendar,
    DollarSign,
    FileText,
    Mail,
    MapPin,
    Phone,
} from "lucide-react";

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

export default function CustomerProfile() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Profile</CardTitle>
                <CardDescription>
                    View and manage your customer information
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-6 md:flex-row">
                    <div className="md:w-1/3">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <Avatar className="mb-4 h-24 w-24">
                                <AvatarImage
                                    src="/placeholder.svg?height=96&width=96"
                                    alt="Acme Corp"
                                />
                                <AvatarFallback>AC</AvatarFallback>
                            </Avatar>
                            <h3 className="text-xl font-bold">
                                Acme Corporation
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Enterprise Client
                            </p>
                            <Badge className="mt-2">VIP Customer</Badge>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                    Technology Industry
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                    contact@acmecorp.com
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                    +1 (555) 123-4567
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                    123 Business Ave, New York, NY
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                    Client since: Jan 2020
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                    Total Revenue: $145,000
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2">
                            <Button>Contact Customer</Button>
                            <Button variant="outline">Schedule Meeting</Button>
                        </div>
                    </div>

                    <div className="md:w-2/3">
                        <Tabs defaultValue="purchase-history">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="purchase-history">
                                    Purchase History
                                </TabsTrigger>
                                <TabsTrigger value="active-contracts">
                                    Active Contracts
                                </TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                            </TabsList>

                            <TabsContent
                                value="purchase-history"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-lg border p-4"
                                        >
                                            <div>
                                                <h4 className="font-medium">
                                                    Enterprise Software License
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Purchased on Nov 15, 2023
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">
                                                    $12,500.00
                                                </p>
                                                <Badge
                                                    variant="outline"
                                                    className="mt-1"
                                                >
                                                    Completed
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    View All Purchases
                                </Button>
                            </TabsContent>

                            <TabsContent
                                value="active-contracts"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-4">
                                    {[1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-lg border p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-8 w-8 text-muted-foreground" />
                                                <div>
                                                    <h4 className="font-medium">
                                                        Annual Support Contract
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Expires: Dec 31, 2023
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm">
                                                View
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="notes"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-4">
                                    <div className="rounded-lg border p-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <h4 className="font-medium">
                                                Meeting Notes
                                            </h4>
                                            <span className="text-xs text-muted-foreground">
                                                Nov 10, 2023
                                            </span>
                                        </div>
                                        <p className="text-sm">
                                            Client expressed interest in
                                            expanding their current software
                                            license to include additional
                                            modules. Follow up with a proposal
                                            by next week.
                                        </p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <h4 className="font-medium">
                                                Contract Discussion
                                            </h4>
                                            <span className="text-xs text-muted-foreground">
                                                Oct 25, 2023
                                            </span>
                                        </div>
                                        <p className="text-sm">
                                            Discussed renewal terms for the
                                            annual support contract. Client
                                            requested pricing options for a
                                            2-year commitment.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm">Add Note</Button>
                                    <Button variant="outline" size="sm">
                                        View All Notes
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
