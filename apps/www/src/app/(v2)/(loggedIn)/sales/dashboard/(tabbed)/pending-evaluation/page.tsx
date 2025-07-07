import { Metadata } from "next";
import {
    SalesQueryParams,
    getSalesAction,
} from "../../_actions/get-sales-action";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import PageClient from "../../_components/page-client";
import ServerTab from "../../_components/server-tab";

export const metadata: Metadata = {
    title: "Sales",
};
export type SalesPageType =
    | "orders"
    | "delivery"
    | "pickup"
    | "quotes"
    | "productions";
interface Props {
    searchParams: SalesQueryParams;
    params: { type: SalesPageType };
}
export default async function SalesPage({ searchParams, params }: Props) {
    const promise = getSalesAction({
        ...searchParams,
        // type: "order",
        status: "Evaluating",
    });

    return (
        <FPage title={"Sales"}>
            <PageClient
                createType="order"
                evaluation
                type="orders"
                response={promise}
            />
        </FPage>
    );
}
