import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import CustomerMenu from "@/app/(v1)/(loggedIn)/sales/(customers)/customers/_components/customer-menu";
import RecentPayments from "@/app/(v1)/(loggedIn)/sales/(customers)/customers/_components/recent-payments";
import RecentSalesCard from "@/components/_v1/sales/recent-sales-card";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { StartCard, StatCardContainer } from "@/components/_v1/stat-card";
import { ICustomer } from "@/types/customers";
import { Metadata } from "next";
import { getCustomerAction } from "../../_actions/sales-customers";
import NewSalesBtn from "../../../orders/components/new-sales-btn";

export const metadata: Metadata = {
    title: "Customer Overview",
};
export default async function CustomerPage(props) {
    const params = await props.params;
    const response = await getCustomerAction(+params.slug);
    const { customer } = response;
    metadata.title = `${customer?.name} | Overview`;
    const { salesOrders, totalSales, amountDue, completedOrders } =
        customer._count;
    //   console.log(customer._count);
    return (
        <AuthGuard can={["viewSalesCustomers"]}>
            <DataPageShell<ICustomer>
                data={customer}
                className="space-y-4 sm:px-8"
            >
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink link="/sales/customers" title="Customers" />
                    <BreadLink isLast title={customer.name} />
                </Breadcrumbs>
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">
                        {customer?.name}
                    </h2>
                    <div className="flex items-center space-x-2">
                        {/* <DatePicker /> */}
                        {/* <CustomerMenu customer={customer} /> */}
                        <NewSalesBtn type="customer" />
                    </div>
                </div>
                <div className="space-y-4">
                    <StatCardContainer>
                        <StartCard
                            icon="dollar"
                            value={customer.wallet?.balance}
                            label="Wallet"
                            money
                        />
                        <StartCard
                            icon="dollar"
                            value={totalSales}
                            label="Total Sales"
                            money
                        />
                        <StartCard
                            icon="dollar"
                            value={amountDue}
                            label="Amount Due"
                            money
                        />
                        <StartCard
                            label="Total Orders"
                            icon="lineChart"
                            value={salesOrders}
                            info={`${completedOrders || 0} completed`}
                        />
                        {/* <StartCard
            icon="line"
            label="Doors Ordered"
            value={totalDoors}
            info={`${completedDoors || 0} completed`}
          /> */}
                    </StatCardContainer>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <RecentSalesCard className="col-span-4" />
                        <RecentPayments className="col-span-3" />
                    </div>
                </div>
                {/* </TabsContent> */}
                {/* </Tabs> */}
            </DataPageShell>
        </AuthGuard>
    );
}
