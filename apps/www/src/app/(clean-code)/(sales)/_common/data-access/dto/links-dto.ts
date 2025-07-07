import { Item } from "./sales-list-dto";

export function salesLinks(data: Item) {
    return {
        edit: data.isDyke ? `` : ``,
        overview: `/sales-book/${data.type}/${data.slug}`,
        customer: data.customer
            ? `/sales-book/customer/${data.customer?.id}`
            : null,
    };
}
