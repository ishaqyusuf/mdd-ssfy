import { Icons } from "../_v1/icons";

export default function useCommands() {
    return {
        commands,
    };
}

function _new(title, link, Icon, shortCut: any = null) {
    return {
        title,
        link,
        Icon,
        shortCut,
    };
}
const commands = [
    _new("Orders", "/sales-books/orders", Icons.orders, "O"),
    _new("New Order", "/sales/edit/order/new", Icons.orders),
    _new("Quotes", "/sales/quotes", Icons.estimates),
    _new("New Quote", "/sales/edit/quote/new", Icons.estimates),
];
