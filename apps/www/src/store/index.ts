import { configureStore } from "@reduxjs/toolkit";
// import orderFormSlice from "./orderFormSlice";
import type { TypedUseSelectorHook } from "react-redux";
import { useSelector } from "react-redux";
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
        staticData: staticDataSlice,
    },
    middleware(getDefaultMiddleware) {
        return getDefaultMiddleware();
    },
});
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
