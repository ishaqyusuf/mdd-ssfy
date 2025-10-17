import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { transformReduxObject } from "./slicers";
import { deepCopy } from "@/lib/deep-copy";

const initialState = {};

const staticDataSlice = createSlice({
    name: "static-data",
    initialState,
    reducers: {
        update(state, action: PayloadAction<{ key; data }>) {
            const { key, data } = action.payload;
            state[key] = transformReduxObject(deepCopy(data));
        },
    },
});

export default staticDataSlice.reducer;
export const { update: updateStaticData } = staticDataSlice.actions;
