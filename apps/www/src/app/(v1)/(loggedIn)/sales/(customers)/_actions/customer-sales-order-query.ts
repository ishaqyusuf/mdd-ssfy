import dayjs from "dayjs";
import { InvoicePastDue, ShowCustomerHaving } from "../../type";
import { dateQuery } from "@/app/(v1)/_actions/action-utils";
import { ISalesType } from "@/types/sales";

interface Props {
    _having: ShowCustomerHaving;
    _due: InvoicePastDue;
}
export default function customerSalesOrderQuery({ _having, _due }: Props) {
    let to;
    let from = null;
    let query: any = {};
    switch (_due) {
        case "1-30":
            to = dayjs();
            from = dayjs().subtract(30, "days");
            break;
        case "31-60":
            to = dayjs().subtract(31, "days");
            from = dayjs().subtract(60, "days");
        case "61-90":
            to = dayjs().subtract(61, "days");
            from = dayjs().subtract(90, "days");
            break;
        case ">90":
            to = dayjs().subtract(90, "days");
            from = dayjs().subtract(10, "years");
            break;
    }
    const _dateType = "paymentDueDate";
    let dueDateQuery =
        from && to
            ? dateQuery({
                  from,
                  to,
                  _dateType,
              })
            : null;
    if (dueDateQuery)
        query.salesOrders = {
            some: {
                ...dueDateQuery,
            },
        };
    if (!dueDateQuery) dueDateQuery = {};
    // if (dueDateQuery)
    else _having = "Pending Invoice";

    switch (_having) {
        case "Pending Invoice":
            query.salesOrders = {
                some: {
                    type: "order" as ISalesType,
                    amountDue: {
                        gt: 0,
                    },
                    ...dueDateQuery,

                    deletedAt: null,
                },
            };
            break;
        case "No Pending Invoice":
            query.salesOrders = {
                every: {
                    amountDue: 0,
                    type: "order" as ISalesType,
                    deletedAt: null,
                    // ...dueDateQuery,
                },
            };
            break;
        // default:
        // query.salesDoors = {
        //     type: "order",
        //     deletedAt: null,
        //     amountDue: {
        //         gt: 0,
        //     },
        // };
    }
    return query;
}
