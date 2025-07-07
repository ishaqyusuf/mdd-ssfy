import { TruckLoaderForm } from "@/components/_v1/sales/load-delivery/load-delivery";

export function truckBackOrder(data: TruckLoaderForm) {
    Object.entries(data.loader).map(([orderId, v]) => {
        Object.entries(v.loadedItems).map(([itemUID, load]) => {
            load.loadQty = Number(load.loadQty);
            if (load.loadQty < 0)
                throw Error("Load Qty cannot be less than 0.");
            if (!v.backOrders) v.backOrders = {};
            v.backOrders[itemUID] = {
                qty: load.qty,
                checked: false,
                backQty: 0,
            };
            if (load.qty > load.loadQty) {
                data.hasBackOrder = true;
                v.hasBackOrder = true;

                v.backOrders[itemUID] = {
                    backQty: load.qty - load.loadQty,
                    qty: load.qty,
                    checked: false,
                    // loadQty: load.loadQty
                };
            } else if (load.loadQty > load.qty) throw Error("Overload error");
        });
    });
    return data;
}
