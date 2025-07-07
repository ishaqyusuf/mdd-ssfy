import { Metadata } from "next";
import {
    SalesQueryParams,
    getSalesAction,
} from "../../_actions/get-sales-action";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import PageClient from "../../_components/page-client";
import ServerTab from "../../_components/server-tab";

export const metadata: Metadata = {
    title: "Sales | GND",
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
        type: "quote",
    });

    return (
        <FPage title="Quotes">
            <PageClient createType="quote" type="quotes" response={promise} />
        </FPage>
    );
}
