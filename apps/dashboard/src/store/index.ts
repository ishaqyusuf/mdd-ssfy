import { configureStore } from "@reduxjs/toolkit";
// import orderFormSlice from "./orderFormSlice";
import { useSyncExternalStore } from "react";
import orderItemComponentSlice from "./invoice-item-component-slice";
// importCustomerTypes from "./customerProfiles";
// import headerSlice from "./headerNavSlice";
import slicers from "./slicers";
import staticDataSlice from "./static-data-slice";

export const store = configureStore({
    reducer: {
        // orderForm: orderFormSlice,
        //CustomerTypes,
        orderItemComponent: orderItemComponentSlice,
        // headerSlice,
        slicers,
        // slicers: process.env.NODE_ENV === "development" ? undefined : slicers,
        staticData: staticDataSlice,
    },
    middleware(getDefaultMiddleware) {
        return getDefaultMiddleware();
    },
});
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export function useAppSelector<TSelected>(
    selector: (state: RootState) => TSelected,
) {
    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()),
    );
}
