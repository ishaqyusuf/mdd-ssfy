import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import DykeTabLayout from "./_components/dyke-tab-layout";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { getDykeProducts } from "./_actions/get-dyke-products";
import { queryParams } from "@/app/(v1)/_actions/action-utils";
import ProductsTable from "./_components/products-table";
import { Metadata } from "next";
import { Shell } from "@/components/shell";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Door Components | GND",
};
export default async function ProductsPage({ searchParams }) {
    const response = await getDykeProducts(queryParams(searchParams));

    return (
        <AuthGuard can={["editOrders"]}>
            <DykeTabLayout>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink isLast title="Products" />
                </Breadcrumbs>
                <Shell className="">
                    <ProductsTable searchParams={searchParams} {...response} />
                </Shell>
            </DykeTabLayout>
        </AuthGuard>
    );
}
