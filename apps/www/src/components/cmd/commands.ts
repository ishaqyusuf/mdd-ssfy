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
    _new("Orders", "/sales-books/orders", Icons.Orders, "O"),
    _new("New Order", "/sales/edit/order/new", Icons.Orders),
    _new("Quotes", "/sales/quotes", Icons.Estimates),
    _new("New Quote", "/sales/edit/quote/new", Icons.Estimates),
];
