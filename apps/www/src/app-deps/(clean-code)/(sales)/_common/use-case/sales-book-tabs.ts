import { getSalesAnalyticsDta } from "../data-access/sales-analytics-dta";
import { PageTab } from "@/app/(clean-code)/type";

const salesTabs = [
    "Orders",
    "Quotes",
    "Productions",
    "Dispatch",
    // "Delivery",
    // "Pickup",
    // "Pending Evaluation",
] as const;
type SalesTabs = (typeof salesTabs)[number];

export async function getSalesTabActionUseCase() {
    const ls = await getSalesAnalyticsDta();

    let tabs: PageTab[] = salesTabs.map((title) => {
        let count =
            title == "Dispatch"
                ? ls.dispatchCount
                : ls.sales.filter((o) => {
                      switch (title) {
                          case "Orders":
                              return o.type == "order";
                          case "Quotes":
                              return o.type == "quote";
                          // case "Delivery":
                          //     return o.type == "order" && o.deliveryOption == "delivery";
                          // case "Pickup":
                          //     return o.type == "order" && o.deliveryOption == "pickup";
                          case "Productions":
                              return o.type == "order" && o.assignments?.length;
                          // case 'Dispatch':
                          // case "Pending Evaluation":
                          //     return o.status == "Evaluating";
                          default:
                              return false;
                      }
                  }).length;
        const url = (
            {
                // Delivery: "/sales-book/delivery",
                Orders: "/sales-book/orders",
                Pickup: "/sales-book/pickup",
                Quotes: "/sales-book/quotes",
                Productions: "/sales-book/productions",
                Dispatch: "/sales-book/dispatch",
                // "Pending Evaluation": "/sales-book/pending-evaluation",
            } as { [id in SalesTabs]: string }
        )[title];
        return {
            count,
            title,
            params: {},
            url,
            // url: "",
        };
    });
    return tabs;
}
