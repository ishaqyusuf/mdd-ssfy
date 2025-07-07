import { Metadata } from "next";
import {
    SalesQueryParams,
    getSalesAction,
} from "../../_actions/get-sales-action";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import PageClient from "../../_components/page-client";

export const metadata: Metadata = {
    title: "Sales",
};
// export type SalesPageType =
//     | "orders"
//     | "delivery"
//     | "pickup"
//     | "quotes"
//     | "productions";
interface Props {
    searchParams: SalesQueryParams;
    params;
}
export default async function SalesPage({ searchParams, params }: Props) {
    const promise = getSalesAction({
        ...searchParams,
        type: "order",
    });

    return (
        <FPage title={"Sales"}>
            <PageClient createType="order" type="orders" response={promise} />
        </FPage>
    );
}
